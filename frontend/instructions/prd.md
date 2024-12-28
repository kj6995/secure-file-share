# Product Requirements Document: File Sharing with Access Control

## Overview

This document outlines the design and implementation of a secure file-sharing system with access control. Users can share files with specific permissions (view-only or download) using one-time shareable links with expiration times.

## Functional Requirements

### 1. File Sharing

Users must be able to:

* Share files with other users by generating a unique, secure link
* Specify access permissions (view-only or download)
* Set an expiration time for the shared link

### 2. Access Control

* Only authorized users or recipients with valid shareable links can access files
* Links must have time-bound validity
* Support login enforcement for accessing shared files (if required)

### 3. Token Verification and Validation

* Ensure tokens are unique, secure, and short-lived
* Verify token validity, permissions, and associated file information before granting access

### 4. Access Modes

* View-Only Access: Stream the file securely to prevent downloads
* Download Access: Allow both downloading and previewing of the file

## Database Design

### 1. Files Table
Already present, please check the structure.

### 2. ShareableLinks Table

Stores metadata for generated shareable links.

| Field | Type | Description |
|-------|------|-------------|
| token | VARCHAR (PK) | Unique, secure token for the shareable link |
| file_id | INT (FK) | Foreign key linking to Files.file_id |
| permissions | ENUM | Access permissions (e.g., 'view-only', 'download') |
| expires_at | TIMESTAMP | Expiration time of the token |
| created_by | INT (FK) | Foreign key linking to Users.user_id |
| accessed_by | INT (FK) | ID of the user who accessed the file (optional) |
| created_at | TIMESTAMP | Timestamp when the link was created |

## 1. Shareable Link Generation (Regular User)

### 1.1 Frontend Implementation


Workflow:

* Add a "Share" button to the file list UI, only for the regular user and admin user, not for the guest user
* When clicked:
  * Open a modal to select permissions and expiration time
  * Expiration time would be a dropdown with options like "24 hrs", "12 hrs", "6 hrs" "3 hr", "1 hr" , "2min" and "1 min". In ascending order with "1 min" at the top of the dropdown. 
  * Send a POST request to the backend to generate the link:

```javascript
fetch('/api/generate-link', {
    method: 'POST',
    body: JSON.stringify({
        fileId: selectedFileId,
        permissions: 'view-only',
        "expiresIn": 60 // in minutes 
    }),
    headers: { 'Content-Type': 'application/json' }
})
.then(response => response.json())
.then(data => console.log('Shareable Link:', data.link));
```

### 1.2 Backend Implementation to generate token

A secure, unique token is generated when a file is shared.

Implementation:

Use a cryptographically secure random generator:

```python
from datetime import datetime, timedelta
import secrets

def generate_shareable_link(payload):
    file_id = payload['fileId']
    permissions = payload['permissions']
    expires_in = payload['expiresIn']  # In minutes

    # Calculate expiration time
    expiration_time = datetime.utcnow() + timedelta(minutes=expires_in)

    # Generate a secure token
    token = secrets.token_urlsafe(32)

    # Insert into database
    query = """
    INSERT INTO ShareableLinks (token, file_id, permissions, expires_at, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?);
    """
    db.execute(query, (
        token,
        file_id,
        permissions,
        expiration_time,
        payload['createdBy'],  # Assuming user ID is included in the payload
        datetime.utcnow()
    ))
    # Return the shareable link
    return {
        "link": f"https://app.com/viewfile?token={token}"
    }
```

## 2. Accessing the Link (Guest User)

### 2.1 Frontend Implementation:

1. Guest User clicks the link (e.g., http://app.com/viewfile/{token})
2. The frontend extracts the {token} from the URL parameter.
3. When the Guest User opens the link, the system checks if they are logged in
4. If the Guest User is not logged in:
  4.1 Redirect them to the login page /auth
  4.2 After successful login, redirect back to the link (e.g., using a redirect_uri query parameter /api/auth?redirect_uri=/viewfile/{token})
5 If the Guest User is already logged in, proceed to token verification by calling the backend with /verify-token/?token=${token}
* if the token is not valid then show the appropriate error message like "Token Invalid" or "Token Expired" based on whatever is the case.

### 2.2 Backend Implementation to verify token

1. The backend extracts the token from the query parameter.
2. The backend queries the ShareableLinks table:
sql
```
SELECT file_id, permissions, expires_at
FROM ShareableLinks
WHERE token = ? AND expires_at > NOW();
```
Checks:
3. Is the token valid (exists in the database)? if not valid then respond with an error
json
```
{
    "error": "Access Denied",
    "message": "This link is invalid"
}
```
4. Is the token not expired (expires_at > NOW())? if expired then respond with an error
json
```
{
    "error": "Access Denied",
    "message": "This link has expired"
}
```
5. If valid, respond with the file metadata and permissions:
json
```
{
    "fileId": 123,
    "permissions": "view-only"
}
```

## 3. File Access Handling in the Frontend:

The frontend should handle the following scenarios:
1. If the token is invalid, show an appropriate error message in UI.
2. If the token is expired, show an appropriate error message in UI.
3. If the token is valid and the user is authorized to download the file, then show the file details and permissions. Also show the preview and also give the button to download the file directly.
3. If the token is valid and the user is authorized to view the file, it is very similar to the above case, just disable the download button but all the other UI things remain the same.

