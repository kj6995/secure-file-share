# Secure File Share

A secure file sharing application with end-to-end encryption built using Next.js and Django.

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/kj6995/secure-file-share.git
```

2. Navigate to the project directory:
```bash
cd secure-file-share
```

3. Start the application:
```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Architecture

The application consists of two main components:
- Frontend: Next.js application with TypeScript
- Backend: Django application with SQLite database

## Development

To run the applications separately for development:

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## License

[MIT License](LICENSE)
