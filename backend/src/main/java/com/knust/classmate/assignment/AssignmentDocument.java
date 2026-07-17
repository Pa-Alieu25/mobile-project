package com.knust.classmate.assignment;

import jakarta.persistence.*;

/**
 * The stored bytes of an assignment's attached document. Kept in its own table
 * so listing assignments never loads the (potentially large) file contents —
 * the bytes are only read when a student downloads the document.
 */
@Entity
@Table(name = "assignment_documents")
public class AssignmentDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private Long assignmentId;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String mimeType;

    @Column(nullable = false)
    private long size;

    @Lob
    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    public AssignmentDocument() {}

    public Long getId() { return id; }
    public Long getAssignmentId() { return assignmentId; }
    public void setAssignmentId(Long assignmentId) { this.assignmentId = assignmentId; }
    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }
    public String getMimeType() { return mimeType; }
    public void setMimeType(String mimeType) { this.mimeType = mimeType; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    public byte[] getData() { return data; }
    public void setData(byte[] data) { this.data = data; }
}
