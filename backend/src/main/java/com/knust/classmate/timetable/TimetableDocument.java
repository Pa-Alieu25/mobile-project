package com.knust.classmate.timetable;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * An uploaded official timetable file (PDF/DOC/DOCX/XLS/XLSX/CSV). The bytes are
 * stored here; the metadata is what the timetable list returns so students can
 * see a document exists and download it. Separate from the per-class
 * TimetableRecord rows, which remain the source of truth for live status changes.
 */
@Entity
@Table(name = "timetable_documents")
public class TimetableDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String mimeType;

    @Column(nullable = false)
    private long size;

    // No @Lob: Hibernate 6 maps @Lob byte[] to the JDBC BLOB/OID API, which
    // conflicts with the "bytea" column type on PostgreSQL and throws at save
    // time. Plain byte[] maps to VARBINARY, which matches bytea correctly.
    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    @Column(nullable = false)
    private String uploadedBy;

    @Column
    private Long uploadedByUserId;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime uploadedAt;

    public TimetableDocument() {}

    public Long getId() { return id; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
    public String getUploadedBy() { return uploadedBy; }
    public void setUploadedBy(String uploadedBy) { this.uploadedBy = uploadedBy; }
    public Long getUploadedByUserId() { return uploadedByUserId; }
    public void setUploadedByUserId(Long uploadedByUserId) { this.uploadedByUserId = uploadedByUserId; }
    public LocalDateTime getUploadedAt() { return uploadedAt; }

    public String getUploadedAtFormatted() {
        if (uploadedAt == null) return "";
        return uploadedAt.format(DateTimeFormatter.ofPattern("dd MMM yyyy, h:mm a"));
    }
}
