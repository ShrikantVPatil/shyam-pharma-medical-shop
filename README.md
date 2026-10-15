**SHYAM PHARMA — Medical Shop Management System**

A full-stack web application designed to simplify medical store operations, including medicine management, inventory tracking, sales, billing, and reporting.

**🌐 Live Demo: SHYAM PHARMA**

**📌 About the Project**

SHYAM PHARMA is a Medical Shop Management System built to manage essential pharmacy operations through a single web application.

The project focuses on organizing medicine records, tracking stock, processing sales, generating bills, and viewing reports through a modern and user-friendly interface.

This application is deployed online, making it accessible through a web browser without requiring local installation.

**✨ Features**
Dashboard: View key information about medical store operations.
Medicine Management: Add, view, update, and manage medicine records.
Inventory Management: Track stock quantities and inventory information.
Sales Management: Record sales and automatically update medicine stock.
Billing & Payments: Generate and manage bills for transactions.
Reports: View sales information and business summaries.
Authentication: Secure login for authorized staff.
Cloud Database: Store application data in a hosted MySQL database.
Responsive Interface: Access the application through a modern web browser.

**🛠️ Technology Stack**
Technology	Purpose
React	Frontend user interface
FastAPI	Backend API and business logic
Python	Backend programming language
MySQL	Database management
SQLAlchemy	Database interaction
JWT	Authentication tokens
Git & GitHub	Version control and source code management
Render	Frontend and backend hosting
Aiven	Hosted MySQL database

**🏗️ Application Architecture**

The application follows a frontend–backend–database architecture.

Frontend: React provides the interface through which users interact with the application.
Backend: FastAPI receives requests, validates data, handles business logic, and communicates with the database.
Database: MySQL stores medicines, users, sales, bills, and related records.
Deployment: Render hosts the web application and API, while Aiven hosts the MySQL database.

Request flow:

User → React Frontend → FastAPI Backend → MySQL Database

**🚀 Live Application**

Try the deployed application:

Open SHYAM PHARMA

The application is hosted online. The first request may take longer if the free backend service has been idle.

Demo note: Use authorized demo credentials if provided. Do not use real patient or customer information.

💻 Run Locally
Prerequisites
Python
Node.js and npm
MySQL
Git
1. Clone the repository
git clone https://github.com/ShrikantVPatil/shyam-pharma-medical-shop.git
cd shyam-pharma-medical-shop
2. Configure the backend

Open the backend folder and create the required environment configuration using the variable names expected by the application.

Configure your database connection and JWT secret. Install the Python dependencies listed in backend/requirements.txt.

Start the FastAPI application using the entry point and command configured for this project.

3. Configure the frontend

Install the frontend dependencies from the frontend directory:

cd frontend
npm install

Configure VITE_API_URL with the URL of your running backend API.

Start the frontend using:

npm run dev

The frontend development server will display the local address where the application can be opened.

Note: Local setup requires a configured MySQL database and the appropriate environment variables. Never commit passwords, database credentials, JWT secrets, or .env files to GitHub.

🔐 Security
Keep sensitive configuration in environment variables.
Never publish database passwords or JWT signing secrets.
Use authentication and backend authorization to protect restricted operations.
Use fictional data when demonstrating the application publicly.
📚 What I Learned

Building SHYAM PHARMA helped me connect concepts that I had previously learned separately.

Through this project, I gained practical experience with:

Connecting a React frontend to a FastAPI backend.
Understanding HTTP requests and REST API endpoints.
Working with MySQL and SQLAlchemy.
Implementing authentication using JWT.
Managing medicine inventory and sales-related logic.
Understanding how sales affect stock quantities.
Deploying a full-stack application to cloud hosting platforms.
Debugging errors and configuring communication between frontend and backend.
Using Git and GitHub to manage and publish source code.
**💭 My Development Journey**

**SHYAM PHARMA is my first working full-stack project, and it has been an important learning experience for me.**

**I used ChatGPT as a learning and development assistant throughout the process. It helped me understand concepts, work through errors, and connect different parts of the application. I also invested my own time in implementing the features, testing the application, troubleshooting problems, and learning how the components work together.**

**One of the most valuable parts of this experience was understanding not only how to write code, but also how the frontend, backend, database, and deployment process work together to create a functioning application.**

**I genuinely enjoyed the process, including the challenges and debugging along the way. This project has motivated me to continue learning, improving my skills, and building more applications.**

**This is the beginning of my development journey, not the end. I plan to keep learning, add improvements, and share more projects here as I grow as a developer.**

🔮 Future Improvements

Some areas I may explore in future versions include:

Improved dashboard analytics.
Medicine expiry-date tracking and alerts.
Low-stock notifications.
Enhanced reporting and data visualization.
Automated testing and additional validation.
Further improvements to security and user experience.
👨‍💻 Developer

***Mr. Shrikant Patil***

***This project represents my first major step toward building practical, full-stack applications and learning through hands-on development.***

If you explore this project, feedback and suggestions are welcome!

⭐ If you find this project interesting, consider giving the repository a star.
