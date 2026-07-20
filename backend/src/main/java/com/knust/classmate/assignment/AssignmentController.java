package com.knust.classmate.assignment;

import com.knust.classmate.audit.AuditService;
import com.knust.classmate.exception.ApiException;
import com.knust.classmate.user.User;
import com.knust.classmate.user.UserRepository;
import com.knust.classmate.user.UserRole;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/assignments")
public class AssignmentController {

    // Common academic document formats a lecturer might share, plus photos of
    // handwritten notes/notices.
    private static final Set<String> ALLOWED_EXTENSIONS =
        Set.of("pdf", "doc", "docx", "ppt", "pptx", "jpg", "jpeg", "png");
    private static final long MAX_DOCUMENT_BYTES = 25L * 1024 * 1024; // 25 MB

    private final AssignmentRepository assignmentRepository;
    private final AssignmentDocumentRepository documentRepository;
    private final AssignmentCompletionRepository completionRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    @Autowired
    public AssignmentController(AssignmentRepository assignmentRepository,
                                 AssignmentDocumentRepository documentRepository,
                                 AssignmentCompletionRepository completionRepository,
                                 UserRepository userRepository,
                                 AuditService auditService) {
        this.assignmentRepository = assignmentRepository;
        this.documentRepository = documentRepository;
        this.completionRepository = completionRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<List<AssignmentResponse>> getAll(Authentication authentication) {
        User user = currentUser(authentication);
        Set<Long> completedIds = completionRepository.findByUserId(user.getId()).stream()
            .map(AssignmentCompletion::getAssignmentId)
            .collect(Collectors.toSet());
        List<AssignmentResponse> response = assignmentRepository.findAllByOrderByPostedAtDesc().stream()
            .map(a -> AssignmentResponse.from(a, completedIds.contains(a.getId())))
            .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<Assignment> create(
            @Valid @RequestBody AssignmentRequest request,
            Authentication authentication) {
        User user = currentUser(authentication);

        String description = request.description() != null && !request.description().isBlank()
            ? request.description() : null;

        Assignment assignment = Assignment.builder()
            .courseCode(request.courseCode())
            .title(request.title())
            .description(description)
            .dueDate(request.dueDate())
            .classGroup(request.classGroup() != null ? request.classGroup() : "ALL")
            .postedBy(user.getFullName())
            .postedByUserId(user.getId())
            .build();

        Assignment saved = assignmentRepository.save(assignment);
        auditService.log("ASSIGNMENT_POSTED", request.courseCode() + ": " + request.title());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> delete(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        Assignment assignment = assignmentRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assignment not found."));

        assertCanManage(user, assignment.getPostedByUserId());

        documentRepository.findByAssignmentId(id).ifPresent(documentRepository::delete);
        completionRepository.deleteByAssignmentId(id);
        assignmentRepository.delete(assignment);
        auditService.log("ASSIGNMENT_DELETED", assignment.getCourseCode() + ": " + assignment.getTitle());
        return ResponseEntity.noContent().build();
    }

    // Marks this assignment done by the signed-in user. Idempotent — safe to
    // call more than once for the same assignment.
    @PutMapping("/{id}/complete")
    public ResponseEntity<Void> markComplete(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        if (!assignmentRepository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Assignment not found.");
        }
        if (completionRepository.findByAssignmentIdAndUserId(id, user.getId()).isEmpty()) {
            completionRepository.save(new AssignmentCompletion(id, user.getId()));
        }
        return ResponseEntity.noContent().build();
    }

    // Moves this assignment back to pending for the signed-in user only.
    @DeleteMapping("/{id}/complete")
    @Transactional
    public ResponseEntity<Void> markPending(@PathVariable Long id, Authentication authentication) {
        User user = currentUser(authentication);
        completionRepository.deleteByAssignmentIdAndUserId(id, user.getId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/document")
    public ResponseEntity<Assignment> uploadDocument(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            Authentication authentication) {
        User user = currentUser(authentication);
        Assignment assignment = assignmentRepository.findById(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Assignment not found."));

        assertCanManage(user, assignment.getPostedByUserId());

        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose a document to upload.");
        }
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        String extension = extensionOf(originalName);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                "Unsupported file type. Please upload a PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG or PNG file.");
        }
        if (file.getSize() > MAX_DOCUMENT_BYTES) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File is too large. The maximum size is 25 MB.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Could not read the selected file. Please try again.");
        }

        AssignmentDocument document = documentRepository.findByAssignmentId(id)
            .orElseGet(AssignmentDocument::new);
        document.setAssignmentId(id);
        document.setOriginalName(originalName);
        document.setMimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
        document.setSize(file.getSize());
        document.setData(bytes);
        documentRepository.save(document);

        assignment.setDocumentName(originalName);
        assignment.setDocumentType(document.getMimeType());
        assignment.setDocumentSize(file.getSize());
        Assignment saved = assignmentRepository.save(assignment);

        auditService.log("ASSIGNMENT_DOCUMENT_UPLOADED", assignment.getCourseCode() + ": " + originalName);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/{id}/document")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        AssignmentDocument document = documentRepository.findByAssignmentId(id)
            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "This assignment has no document."));

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

    private User currentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
            .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    /** Only the post's creator or an admin may manage (delete / attach documents). */
    private void assertCanManage(User user, Long ownerId) {
        boolean isAdmin = user.getRole() == UserRole.ADMIN;
        boolean isOwner = ownerId != null && ownerId.equals(user.getId());
        if (!isAdmin && !isOwner) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You can only manage assignments you posted.");
        }
    }

    private static String extensionOf(String filename) {
        int dot = filename.lastIndexOf('.');
        return dot >= 0 ? filename.substring(dot + 1).toLowerCase(Locale.ROOT) : "";
    }
}
