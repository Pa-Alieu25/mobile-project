# KNUST ClassMate Backend

Spring Boot backend for the KNUST ClassMate mobile app.

## Stack

- Java 17
- Spring Boot 3.3.5
- Spring Web
- Spring Security
- Spring Data JPA
- PostgreSQL (NeonDB)
- Maven

## Run Locally

```bash
cd backend
mvn spring-boot:run
```

## Health Check

```
GET http://localhost:8080/api/health
```

Expected response:

```json
{
  "status": "KNUST ClassMate backend is running"
}
```

## Environment Variables

Set these before running:

```
DATABASE_URL=jdbc:postgresql://your-neon-host/your-db?sslmode=require
DATABASE_USERNAME=your-username
DATABASE_PASSWORD=your-password
```

## Package Structure

```
com.knust.classmate
├── auth
├── user
├── programme
├── level
├── classgroup
├── course
├── venue
├── announcement
├── assignment
├── timetable
├── examvenue
├── file
├── notification
├── subscription
└── config
```
