# TaskOnBudget Backend

Backend API for TaskOnBudget - a freelance task management platform.

## Tech Stack
- **Node.js + NestJS**
- **PostgreSQL + Prisma ORM**
- **JWT Authentication** (Access + Refresh Tokens)
- **Socket.IO** (Real-time Chat + WebRTC Signaling)
- **UPI Payments** (QR Code based)
- **File Storage**: Database binary storage

## Prerequisites
- Node.js (v18+)
- PostgreSQL database

## Setup Instructions

1. **Clone the repository** (if applicable) and navigate to the project root.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Update the `.env` file with your credentials:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `STRIPE_SECRET_KEY`
   - `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - `S3_*` credentials for file storage

4. **Initialize Database**:
   ```bash
   npx prisma migrate dev --name init
   ```

5. **Run the Application**:
   ```bash
   npm run start:dev
   ```

## API Documentation
Once the server is running, access the Swagger UI at:
`http://localhost:3000/api`

## Core Modules
- **AuthModule**: Registration, login, and JWT token management
- **TaskModule**: Task lifecycle management (SUBMITTED → COMPLETED)
- **PaymentModule**: UPI QR code payment with manual verification
- **FileModule**: Secure file uploads stored in database
- **ChatModule**: Real-time task-scoped chat
- **ScreenshareModule**: WebRTC signaling for screen sharing

## License
MIT
