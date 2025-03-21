# SVKM Bill Management System

A comprehensive bill management system with workflow capabilities for tracking and managing bills through various stages of approval.

## Features

- **Bill Management**: Create, update, and track bills throughout their lifecycle
- **Workflow System**: Configurable approval workflow with role-based permissions
- **Vendor Management**: Validate and track vendors for each bill
- **Import/Export**: Import bills from Excel and CSV files with data validation
- **Authentication**: JWT-based authentication with role-based access control
- **Workflow Dashboard**: Analytics and reporting on bill processing efficiency
- **Audit Trail**: Complete history tracking of all bill transitions

## Workflow Features

The system implements a robust workflow engine that tracks bills through various states:

1. **State Transitions**: Bills move through predefined states (e.g., Draft, Pending Approval, Approved, Payment Initiated, Completed)
2. **Role-Based Actions**: Different user roles can perform specific actions on bills in certain states
3. **Performance Metrics**: Track processing time for each state and user performance
4. **Audit Trail**: All transitions are logged with timestamp, actor, and comments
5. **Rejection Handling**: Support for rejecting bills with reason, sending them back to previous stages
6. **Dashboard Analytics**: Visual representation of workflow efficiency and bottlenecks

## API Endpoints

### Authentication
- `POST /api/auth/register`: Register a new user
- `POST /api/auth/login`: User login
- `GET /api/auth/me`: Get current user profile
- `PUT /api/auth/password`: Update password

### Bills
- `GET /api/bills`: Get all bills (with filtering)
- `POST /api/bills`: Create a new bill
- `GET /api/bills/:id`: Get a single bill
- `PUT /api/bills/:id`: Update a bill
- `DELETE /api/bills/:id`: Delete a bill
- `POST /api/bills/import/csv`: Import bills from CSV
- `POST /api/bills/import/excel`: Import bills from Excel
- `GET /api/bills/export`: Export bills to Excel

### Workflow
- `GET /api/workflow/stats`: Get workflow dashboard statistics
- `GET /api/workflow/bill/:billId/history`: Get workflow history for a bill
- `GET /api/workflow/user/:userId/activity`: Get user workflow activity
- `GET /api/workflow/performance/roles`: Get role performance metrics

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and configure your environment variables
3. Install dependencies: `npm install`
4. Start the development server: `npm run dev`

## Technologies

- Backend: Node.js, Express.js
- Database: MongoDB with Mongoose
- Authentication: JWT
- Data Processing: ExcelJS, csv-parser
- Frontend (separate repo): React with Material-UI

## License

MIT