package com.knust.classmate.timetable;

import com.knust.classmate.audit.AuditService;
import com.knust.classmate.exception.ApiException;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import com.knust.classmate.user.UserRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@RestController
@RequestMapping("/timetable/document")
public class TimetableDocumentController {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("pdf", "doc", "docx", "xls", "xlsx", "csv");
    private static final long MAX_DOCUMENT_BYTES = 10L * 1024 * 1024; // 10 MB

    private final TimetableDocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Autowired
    public TimetableDocumentController(TimetableDocumentRepository documentRepository,
                                       UserRepository userRepository,
                                       AuditService auditService) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /** List uploaded timetable documents (metadata only), newest first. */
    @GetMapping
    public ResponseEntity<List<TimetableDocumentResponse>> list() {
        return ResponseEntity.ok(
            documentRepository.findAllByOrderByUploadedAtDesc().stream()
                .map(TimetableDocumentResponse::from).toList());
    }

    @PostMapping
    public ResponseEntity<TimetableDocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        User user = currentUser(authentication);

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose a timetable document to upload.");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "timetable";
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                "Unsupported file type. Please upload a PDF, DOC, DOCX, XLS, XLSX or CSV file.");
        }
        if (file.getSize() > MAX_DOCUMENT_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is too large. The maximum size is 10 MB.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read the selected file. Please try again.");
        }

        TimetableDocument document = new TimetableDocument();
        document.setOriginalName(originalName);
        document.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        document.setSize(file.getSize());
        document.setData(bytes);
        document.setUploadedBy(user.getFullName());
        document.setUploadedByUserId(user.getId());
        TimetableDocument saved = documentRepository.save(document);

        auditService.log("TIMETABLE_DOCUMENT_UPLOADED", originalName);
        return ResponseEntity.status(HttpStatus.CREATED).body(TimetableDocumentResponse.from(saved));
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> download(@PathVariable Long id) {
        TimetableDocument document = documentRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Timetable document not found."));

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(document.getMimeType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentLength(document.getSize());
        headers.setContentDisposition(ContentDisposition.attachment().filename(document.getOriginalName()).build());
        return new ResponseEntity<>(document.getData(), headers, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        TimetableDocument document = documentRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Timetable document not found."));

        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isOwner = document.getUploadedByUserId() != null
            && document.getUploadedByUserId().equals(user.getId());
        if (!isAdmin && !isOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only delete timetable documents you uploaded.");
        }

        documentRepository.delete(document);
        auditService.log("TIMETABLE_DOCUMENT_DELETED", document.getOriginalName());
        return ResponseEntity.noContent().build();
    }

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }
}
