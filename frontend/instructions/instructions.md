# Product Requirements Document (PRD): Secure File Sharing Web Application

## Objective

Develop a secure web application that allows users to upload, download, and share files while maintaining stringent security measures. The system will ensure encryption of data both at rest and in transit and enforce robust authentication and access control mechanisms.

Utilize the following technologies:
Next.js for the front-end, React for the UI, and NextAuth for authentication.
Tailwind CSS for styling.
Redux for state management.
Shadcn for UI components.
Django for the back-end, PostgreSQL for the database.


## Core Features

### 1. User Authentication and Authorization

#### Features
1. Users can register, log in, and log out of the system.
2. Implement multi-factor authentication (MFA) using a TOTP authenticator app (e.g., Google Authenticator) or SMS/email OTP.
3. Role-based access control (RBAC) with the following roles:
   - **Admin**: Manage users, files, and permissions.
   - **Regular User**: Upload, download, and share files.
   - **Guest**: View shared files with restricted access.

#### Technical Considerations
- Use JWT for authentication.
- Enforce secure session handling via HttpOnly and Secure cookies.
- Store passwords securely using bcrypt.
- API endpoints:
  - `POST /api/register`: Create a new user account.
  - `POST /api/login`: Authenticate users with MFA.
  - `POST /api/logout`: End a user session.
  - `GET /api/roles`: Retrieve roles for the authenticated user.

### 2. File Upload and Encryption

#### Features
1. Users can securely upload files.
2. Encrypt files client-side using the Web Crypto API (AES-256) before uploading.
3. Store files on the server encrypted at rest using AES-256 with server-side key management.
4. Allow users to download files and decrypt them securely client-side.

#### Technical Considerations
- Ensure secure file upload with size limits and MIME type validation.
- Encrypt/decrypt files in chunks to support large file uploads/downloads.
- API endpoints:
  - `POST /api/files/upload`: Accept encrypted file data and metadata.
  - `GET /api/files/{id}/download`: Serve encrypted file data for authenticated users.
  - `DELETE /api/files/{id}`: Delete a file (admin-only).
- Database schema:
  - `files` table with fields:
    - `id`: Primary key.
    - `filename`: Original file name.
    - `path`: File storage path.
    - `owner_id`: ID of the user who uploaded the file.
    - `encryption_key`: Server-side encrypted key.

### 3. File Sharing with Access Control

#### Features
1. Users can share files with specific users by assigning them view or download permissions.
2. Generate one-time secure shareable links that expire after a set time.

#### Technical Considerations
- Implement access control checks for file access.
- Generate a UUID for shareable links, stored in the `shared_files` table.
- Shareable links should include:
  - Expiry time.
  - Limited permissions (view/download).
- API endpoints:
  - `POST /api/files/{id}/share`: Generate a secure link.
  - `GET /api/files/shared/{uuid}`: Retrieve file details for shared links.
  - `DELETE /api/files/shared/{uuid}`: Revoke a shared link.

### 4. Secure File Sharing

#### Features
1. Use HTTPS for all communication between the client and server.
2. Shareable links expire automatically after the defined time.
3. Prevent unauthorized access to files or links.

#### Technical Considerations
- Use SSL/TLS with valid certificates.
- Sanitize and validate all input on both front-end and back-end.
- Enforce secure headers (e.g., Content Security Policy, X-Frame-Options).

## File Structure

### Front-End File Structure (React)
```
/src
  /components
    /Auth
      Login.jsx
      Register.jsx
      MFASetup.jsx
    /Files
      FileUpload.jsx
      FileList.jsx
      FileViewer.jsx
      FileShareModal.jsx
    /SharedFiles
      SharedFileViewer.jsx
  /redux
    authSlice.js
    fileSlice.js
  /services
    apiService.js
    encryptionService.js
  App.jsx
  index.js
```

#### Key Front-End Components
1. **Auth Components**
   - `Login.jsx`: Implements user login and MFA.
   - `Register.jsx`: Handles new user registration.
   - `MFASetup.jsx`: Guides users through MFA setup.

2. **File Components**
   - `FileUpload.jsx`: UI for uploading encrypted files.
   - `FileList.jsx`: Displays user files with options for sharing and downloading.
   - `FileViewer.jsx`: Allows file preview (if supported) or download.
   - `FileShareModal.jsx`: Modal for sharing files and generating links.

3. **Shared Files**
   - `SharedFileViewer.jsx`: Displays shared files for guest users with restricted access.

4. **State Management (Redux)**
   - `authSlice.js`: Handles authentication state, including MFA setup and role management.
   - `fileSlice.js`: Manages file data, permissions, and sharing states.

5. **Services**
   - `apiService.js`: Wrapper for making API calls to the back-end.
   - `encryptionService.js`: Handles client-side encryption and decryption.

### Back-End File Structure (Django)
```
/secure_file_share
  /api
    /views
      auth_views.py
      file_views.py
      sharing_views.py
    /models
      user.py
      file.py
      shared_file.py
    /serializers
      auth_serializer.py
      file_serializer.py
      sharing_serializer.py
    /urls.py
  /core
    settings.py
    urls.py
    wsgi.py
```

#### Key Back-End Components
1. **Views**
   - `auth_views.py`: Handles registration, login, MFA, and role retrieval.
   - `file_views.py`: Manages file upload/download and encryption at rest.
   - `sharing_views.py`: Handles file sharing and access controls.

2. **Models**
   - `user.py`: Extends the Django User model to include roles.
   - `file.py`: Stores metadata and encryption details for uploaded files.
   - `shared_file.py`: Tracks shared files and permissions.

3. **Serializers**
   - `auth_serializer.py`: Serializes user data and roles.
   - `file_serializer.py`: Serializes file metadata.
   - `sharing_serializer.py`: Serializes shared file details and permissions.

4. **API Routing**
   - `urls.py`: Maps API endpoints to views.

## Security Requirements
- Enforce HTTPS with SSL/TLS (self-signed certificates for local dev).
- Validate and sanitize input to prevent SQL injection and XSS.
- Secure session management with JWT (short-lived tokens) and HttpOnly cookies.
- Use Content Security Policy (CSP) to prevent malicious scripts.

## Running the Application
docker-compose up --build

## README.md

### Sections to Include
1. **Overview**: Brief project description.
2. **Tech Stack**: List of technologies used.
3. **Setup Instructions**:
   - Prerequisites (Docker, npm, Python).
   - Steps to clone and start the application using `docker-compose up`.
4. **Usage**:
   - How to register, log in, and upload files.
   - Sharing files and using MFA.
5. **Starting the Application**: How to run the application using Docker.