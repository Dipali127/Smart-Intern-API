# Smart-Intern-API

A RESTful Internship Management API built with Node.js and Express.js that connects students and companies.
Students can register, login, explore internships, and apply by submitting their resumes.

Companies can post and update internships, view applicants, and review applications.

The API integrates Google Gemini AI for AI-powered resume screening and automatically generating professional internship descriptions. It also uses Cloudinary for secure resume storage and Nodemailer to automatically notify students about their application status via email.

## 💡 Why I Built This
I built this project to understand how real-world internship platforms work internally.
The core challenge I wanted to solve was making the hiring process smarter — instead of manually reviewing every resume, 
I integrated Google Gemini AI to automate screening and description generation. This taught me how to work with external AI APIs and design workflows around them. I also learned how to handle file uploads securely with Multer and Cloudinary, and send automated email notifications using Nodemailer.

## 🚀 Live API

**Base URL:**  
`https://smart-intern-api-7vgk.onrender.com`

> ⚠️ Note: First request may take 30-60 seconds to respond as the free tier spins down after inactivity.

## ✨ Features

* **Student Functionality:**
- Students can register and log in to their accounts.
- Students can explore available active internships with filters.
- Students can apply for internships by uploading their resume after completing their profile details.
- AI-powered resume screening automatically matches resume skills with internship required skills using Google Gemini AI and cosine similarity.
   
* **Company Functionality:** 
- Companies can register and log in to their accounts.
- After authorization, companies can post new internships and update existing ones.
- Companies can view all applications submitted by students for their posted internships.
- Companies can review applicants and update their application status.
- **AI-Powered Description:** Companies can auto-generate concise and professional internship descriptions using Google Gemini AI.

* **Email Notifications:**
- Students are automatically notified via email about their application status (accepted or rejected) using Nodemailer.

## 🔧 Key Technical Decisions

- **Google Gemini AI for resume screening:** Used gemini-2.5-flash to extract technical skills from resumes and gemini-embedding-001 to convert skills into vector embeddings for similarity comparison. Internship required skill embeddings are pre-generated and stored in the database when a company posts an internship, avoiding regeneration on every student application which reduces latency and improves overall application performance.
- **Cosine similarity for skill matching:** Used cosine similarity to compare resume skill embeddings with internship required skill embeddings instead of direct string comparison, which handles different formats like "JavaScript" and "JS" correctly.
- **Retry mechanism for Cloudinary upload:** Implemented a retry mechanism with maximum 3 attempts for Cloudinary upload to handle temporary network failures without asking the student to re-upload.
- **Multer for file uploads:** Used Multer with disk storage to temporarily store uploaded PDF resumes before uploading them to Cloudinary.
- **Cloudinary for resume storage:** Used Cloudinary to securely store student resumes on cloud storage and get a hosted URL for permanent access.
- **JWT for authentication:** Used JWT to generate tokens for students and companies after login to secure protected routes.
- **bcrypt for password hashing:** Used bcrypt to hash passwords before saving them in the database to ensure sensitive data is never stored as plain text.
- **Nodemailer for email notifications:** Used Nodemailer with Gmail SMTP to automatically notify students about their application status via email.
- **DRY principle:** Created a reusable `deleteLocalFile` helper function to avoid repeating the same file deletion code in multiple places.
- **Pagination:** Implemented pagination for fetching internships to avoid returning all records at once and improve performance.
- **pdf-parse for text extraction:** Used pdf-parse to extract plain text from student resume PDF files before sending to Gemini AI for skill extraction.

## 🤖 AI Resume Screening Workflow

1. Student uploads resume PDF.
2. Multer temporarily stores the uploaded resume locally.
3. pdfParse extracts plain text from the PDF resume.
4. Google Gemini AI extracts technical skills from the resume text extracted by pdfParse.
5. Internship required skills are converted into vector embeddings using `gemini-embedding-001`.
6. Resume skills are also converted into vector embeddings.
7. Cosine similarity compares both embeddings to calculate skill similarity.
8. The similarity score helps companies shortlist candidates more intelligently.
9. Resume is uploaded to Cloudinary for secure storage and permanent access.

## 🗂️ Project Structure

```bash
Smart-Intern-API/
│
├── controllers/
│   ├── studentController.js      # Student registration, login and profile update
│   ├── companyController.js      # Company registration and login
│   ├── internshipController.js   # Internship posting, updating, fetching and AI description generation
│   └── applicationController.js  # Internship application, resume screening and review applicant
│
├── models/
│   ├── studentModel.js           # Student schema
│   ├── companyModel.js           # Company schema
│   ├── internshipModel.js        # Internship schema
│   └── applicationModel.js       # Application schema
│
├── router/
│   ├── studentRoutes.js          # Student API routes
│   ├── companyRoutes.js          # Company API routes
│   ├── internshipRoutes.js       # Internship API routes
│   └── applicationRoutes.js      # Application API routes
│
├── middleware/
│   ├── auth.js                   # JWT authentication middleware
│   └── multer.middleware.js      # Multer file upload middleware
│
├── validator/
│   └── validation.js             # Input validation functions
│
├── fileUpload/
│   └── cloudinary.js             # Cloudinary file upload configuration
│
├── emailConfig/
│   └── emailService.js           # Nodemailer email service configuration
│
├── uploads/                      # Temporary local storage for uploaded resumes
│
├── index.js                      # Entry point of the application
├── .env                          # Environment variables
├── .gitignore                    # Files and folders ignored by Git
└── README.md                     # Project documentation
```

## 🗃️ Models

The application uses the following MongoDB models to manage students, companies, internships, and internship applications.

---

### Student Model

Stores information about registered students.

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | String | Yes | Student's full name |
| `email` | String | Yes | Student's email (unique) |
| `password` | String | Yes | Hashed password |
| `mobileNumber` | String | Yes | Student's mobile number (unique) |
| `DOB` | Date | No | Date of birth |
| `collegeName` | String | No | Name of the college |
| `yearOfPassout` | Number | No | Year of passout |
| `areaOfInterest` | String | No | Student's area of interest |
| `address.country` | String | No | Country |
| `address.state` | String | No | State |
| `address.city` | String | No | City |
| `createdAt` | Date | Auto | Auto-generated timestamp when document is created |
| `updatedAt` | Date | Auto | Auto-generated timestamp when document is updated |

---

### Company Model

Stores information about registered companies.

| Field | Type | Required | Description |
|---|---|---|---|
| `companyName` | String | Yes | Company name |
| `companyEmail` | String | Yes | Company email (unique) |
| `password` | String | Yes | Hashed password |
| `contactNumber` | String | Yes | Company contact number (unique) |
| `createdAt` | Date | Auto | Auto-generated timestamp when document is created |
| `updatedAt` | Date | Auto | Auto-generated timestamp when document is updated |

---

### Internship Model

Stores information about internships posted by companies.

| Field | Type | Required | Description |
|---|---|---|---|
| `companyId` | ObjectId | Yes | MongoDB ObjectId reference to the Company model |
| `category` | String | Yes | Internship domain (e.g. Web Development) |
| `position` | String | Yes | Internship role (e.g. Backend Developer) |
| `description` | String | Yes | Internship description |
| `internshipType` | String | No | Remote, Work From Home (WFH), or Work From Office (WFO) |
| `skillsRequired` | [String] | Yes | Array of required skills |
| `skillEmbedding` | Array | No | Pre-generated vector embeddings for each required skill used for AI-based resume matching
| `eligibility` | String | Yes | Eligibility criteria |
| `duration` | String | Yes | Internship duration |
| `location.country` | String | Yes | Country |
| `location.state` | String | Yes | State |
| `location.city` | String | Yes | City |
| `applicationDeadline` | Date | Yes | Last date to apply |
| `numberOfOpenings` | Number | Yes | Number of available openings |
| `stipend` | String | Yes | Stipend range offered for the internship |
| `status` | String | No | Internship status: active or closed |
| `createdAt` | Date | Auto | Auto-generated timestamp when document is created |
| `updatedAt` | Date | Auto | Auto-generated timestamp when document is updated |

---

### Application Model

Stores information about internship applications submitted by students.

| Field | Type | Required | Description |
|---|---|---|---|
| `studentId` | ObjectId | Yes | MongoDB ObjectId reference to the Student model |
| `internshipId` | ObjectId | Yes | MongoDB ObjectId reference to the Internship model |
| `resume` | String | Yes | Cloudinary URL of uploaded resume |
| `status` | String | No | Application status: pending, accepted, or rejected |
| `createdAt` | Date | Auto | Auto-generated timestamp when document is created |
| `updatedAt` | Date | Auto | Auto-generated timestamp when document is updated |

## 📬 Endpoints

### Student APIs

- **Register Student**

  - **Method:** `POST`
  - **Endpoint:** `/student/register`
  - **Description:** Registers a new student account.

  - **Request Body:**

```json
{
    "name":"Maiden",
    "email":"mDn231A@gmail.com",
    "password":"mD1Y1@546",
    "mobileNumber":"9003976852"
}
```

  - **Success Response (201):**

```json
{
    "status": true,
    "message": "Student registered successfully",
    "data": {
        "name": "Maiden",
        "email": "mDn231A@gmail.com",
        "mobileNumber": "9003976852",
        "_id": "6a15c39fe1e1a362e327a287",
        "createdAt": "2026-05-26T16:00:31.334Z",
        "updatedAt": "2026-05-26T16:00:31.334Z",
        "__v": 0
    }
}
```

---

- **Login Student**

  - **Method:** `POST`
  - **Endpoint:** `/student/login`
  - **Description:** Authenticates a student and returns a JWT token..

  - **Request Body:**

```json
{
    "email": "mDn231A@gmail.com",
    "password": "mD1Y1@546"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Student logged in successfully",
    "token": "jwt_token"
}
```

---

- **Update Student Details**

  - **Method:** `PUT`
  - **Endpoint:** `/student/update/:studentID`
  - **Description:** Updates student profile details. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Request Body:**

```json
{
   "DOB":"2018-03-01",
    "collegeName": "Akido College Of Engineering",
    "yearOfPassout": "2020",
    "areaOfInterest":"Web Development",
    "address": {
        "country":"India",
         "state":"Delhi",
         "city":"New Delhi"
    }
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Student details updated successfully",
    "data": {
            "address": {
            "country": "India",
            "state": "Delhi",
            "city": "New Delhi"
        },
        "_id": "6a15c39fe1e1a362e327a287",
        "name": "Maiden",
        "email": "mDn231A@gmail.com",
        "mobileNumber": "9003976852",
        "createdAt": "2026-05-26T16:00:31.334Z",
        "updatedAt": "2026-05-26T16:04:33.829Z",
        "__v": 0,
        "DOB": "2018-02-28T18:30:00.000Z",
        "areaOfInterest": "Web Development",
        "collegeName": "Akido College Of Engineering",
        "yearOfPassout": 2020
    }
}
```

---

### Company APIs

- **Register Company**

  - **Method:** `POST`
  - **Endpoint:** `/company/register`
  - **Description:** Registers a new company account.

  - **Request Body:**

```json
{
   "companyName": "Google",
   "companyEmail": "Gggt2M1@gmail.com",
   "password": "Gl@@Mi43",
   "contactNumber": "726235614"
}
```

  - **Success Response (201):**

```json
{
    "status": true,
    "message": "Company registered successfully",
    "data": {
        "companyName": "Google",
        "companyEmail": "Gggt2M1@gmail.com",
        "contactNumber": "726235614",
        "_id": "6a15c519e1e1a362e327a28e",
        "createdAt": "2026-05-26T16:06:49.633Z",
        "updatedAt": "2026-05-26T16:06:49.633Z",
        "__v": 0
    }
}
```

---

- **Login Company**

  - **Method:** `POST`
  - **Endpoint:** `/company/login`
  - **Description:** Authenticates a company and returns a JWT token.
  - **Request Body:**

```json
{
    "companyEmail": "Gggt2M1@gmail.com",
    "password": "Gl@@Mi43"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Company logged in successfully",
    "token": "jwt_token"
}
```

---

### Internship APIs

- **Generate AI Internship Description**

  - **Method:** `POST`
  - **Endpoint:** `/internship/generateAIDescription`
  - **Description:** Generates a short AI-based internship description using Gemini AI. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Request Body:**

```json
{
    "position": "Backend Developer",
    "skillsRequired": [
        "JavaScript",
        "MongoDB",
        "Node.js",
        "Express.js",
        "Redis"
    ]
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "AI Description generated successfully",
    "data": "Here are a few options, choose the one that best fits your company's voice:\n\n**Option 1 (Concise & Action-Oriented):**\n\"Eager to build robust backend systems? Join us as a Backend Developer Intern and gain hands-on experience developing high-performance APIs with Node.js, Express.js, MongoDB, Redis, and JavaScript.\"\n\n**Option 2 (Focus on Impact):**\n\"As a Backend Developer Intern, you'll develop impactful, scalable APIs using JavaScript, Node.js, Express.js, MongoDB, and Redis to power our cutting-edge applications.\"\n\n**Option 3 (Direct & Engaging):**\n\"Seeking a Backend Developer Intern passionate about creating efficient backend solutions. You'll master Node.js, Express.js, MongoDB, Redis, and JavaScript while contributing to real-world projects.\""
}
```

---

- **Post Internship**

  - **Method:** `POST`
  - **Endpoint:** `/internship/postInternship/:companyId`
  - **Example:** `/internship/postInternship/6a15c519e1e1a362e327a28e`
  - **Description:** Allows a company to post a new internship. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Request Body:**

```json
{
   "category": "Software Development",
  "position": "Backend Developer",
   "description" : "Seeking a Backend Developer Intern eager to build scalable APIs using JavaScript, Node.js, Express.js, MongoDB, and Redis. Dive into real-world projects and make a tangible impact.",
  "internshipType": "remote",
  "skillsRequired" : ["javaScript", "MongoDB", "Node.JS", "express.Js", "Redis"],
  "eligibility": "B.Tech / B.E / MCA Students",
  "duration": "3 months",
  "location": {
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai"
  },
  "applicationDeadline": "2026-09-30",
  "numberOfOpenings": 5,
  "stipend": "15000-20000"
}
```

  - **Success Response (201):**

```json
{
    "status": true,
    "message": "Internship posted successfully",
    "data": {
        "companyId": "6a15c519e1e1a362e327a28e",
        "category": "Software Development",
        "position": "Backend Developer",
        "description": "Seeking a Backend Developer Intern eager to build scalable APIs using JavaScript, Node.js, Express.js, MongoDB, and Redis. Dive into real-world projects and make a tangible impact.",
        "internshipType": "remote",
        "skillsRequired": [
            "javaScript",
            "MongoDB",
            "Node.JS",
            "express.Js",
            "Redis"
        ],
        "eligibility": "B.Tech / B.E / MCA Students",
        "duration": "3 months",
        "location": {
            "country": "India",
            "state": "Maharashtra",
            "city": "Mumbai"
        },
        "applicationDeadline": "2026-09-29T18:30:00.000Z",
        "numberOfOpenings": 5,
        "stipend": "15000-20000",
        "status": "active",
        "_id": "6a15c680e1e1a362e327a292",
        "createdAt": "2026-05-26T16:12:48.749Z",
        "updatedAt": "2026-05-26T16:12:48.749Z",
        "__v": 0
    }
}
```

---

- **Update Internship**

  - **Method:** `PUT`
  - **Endpoint:** `/internship/updateInternship/:internshipId`
  - **Example:** `/internship/updateInternship/6a15c680e1e1a362e327a292`
  - **Description:** Updates internship details posted by a company. Authentication required. Companies can only update fields like `status`, `internshipType`, `duration`, and `skillsRequired`.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Request Body:**

```json
{
    "duration": "4 months",
    "skillsRequired": [
        "Cloudinary",
        "Data Structures And Algorithms"
    ]
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Updated successfully",
    "data": {
        "location": {
            "country": "India",
            "state": "Maharashtra",
            "city": "Mumbai"
        },
        "_id": "6a15c680e1e1a362e327a292",
        "companyId": "6a15c519e1e1a362e327a28e",
        "category": "Software Development",
        "position": "Backend Developer",
        "description": "Seeking a Backend Developer Intern eager to build scalable APIs using JavaScript, Node.js, Express.js, MongoDB, and Redis. Dive into real-world projects and make a tangible impact.",
        "internshipType": "remote",
        "skillsRequired": [
            "javaScript",
            "MongoDB",
            "Node.JS",
            "express.Js",
            "Redis",
            "cloudinary",
            "Data Structure And Algorithm"
        ],
        "eligibility": "B.Tech / B.E / MCA Students",
        "duration": "4 months",
        "applicationDeadline": "2026-09-29T18:30:00.000Z",
        "numberOfOpenings": 5,
        "stipend": "15000-20000",
        "status": "active",
        "createdAt": "2026-05-26T16:12:48.749Z",
        "updatedAt": "2026-05-26T16:15:55.961Z",
        "__v": 0
    }
}
```

---

- **Get All Internships**

  - **Method:** `GET`
  - **Endpoint:** `/internship/getInternship`
  - **Example:** `/internship/getInternship?limit=3&position=Backend Developer&page=1`
  - **Description:** Returns all available internships and also supports filtering by query parameters such as category, position, internshipType and location. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Internship fetched successfully",
    "data": [
         {
            "By": "Zomato",
            "category": "Software Development",
            "position": "Backend Developer",
            "status": "active"
        },
        {
            "By": "OYO",
            "category": "Software Development",
            "position": "Backend Developer",
            "status": "active"
        },
        {
            "By": "Zepto",
            "category": "Software Development",
            "position": "Backend Developer",
            "status": "active"
        }
    ]
}
```

---

- **Get Internship By ID**

  - **Method:** `GET`
  - **Endpoint:** `/internship/getInternshipById/:internshipId`
  - **Example:** `/internship/getInternshipById/6a15c680e1e1a362e327a292`
  - **Description:** Returns details of a specific internship using the internship ID. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Internship successfully fetched",
    "data": {
       "companyName": "Google",
        "companyEmail": "Gggt2M1@gmail.com",
        "companyContact": "726235614",
        "category": "Software Development",
        "position": "Backend Developer",
        "internshipType": "remote",
        "skillsRequired": [
            "javaScript",
            "MongoDB",
            "Node.JS",
            "express.Js",
            "Redis",
            "cloudinary",
            "Data Structure And Algorithm"
        ],
        "eligibility": "B.Tech / B.E / MCA Students",
        "duration": "4 months",
        "location": {
            "country": "India",
            "state": "Maharashtra",
            "city": "Mumbai"
        },
        "applicationDeadline": "2026-09-29T18:30:00.000Z",
        "numberOfOpenings": 5,
        "stipend": "15000-20000",
        "status": "active"
    }
}
```

---

### Application APIs

- **Apply For Internship**

  - **Method:** `POST`
  - **Endpoint:** `/application/apply/:studentID`
  - **Example:** `/application/apply/6a15c39fe1e1a362e327a287`
  - **Description:** Allows a student to apply for an internship by uploading a resume. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Form Data:**

| Key | Type | Value |
|---|---|---|
| `internshipId` | Text | `6a15c680e1e1a362e327a292` |
| `resume` | File | Upload PDF resume |

  - **Success Response (201):**

```json
{
    "status": true,
    "message": "Application created successfully",
    "data": {
        "studentId": "6a15c39fe1e1a362e327a287",
        "internshipId": "6a15c680e1e1a362e327a292",
        "resume": "http://res.cloudinary.com/dseknlpcn/image/upload/v1779812970/exharo6vw77ursnkeubz.pdf",
        "status": "pending",
        "_id": "6a15ca6be1e1a362e327a2c0",
        "createdAt": "2026-05-26T16:29:31.766Z",
        "updatedAt": "2026-05-26T16:29:31.766Z",
        "__v": 0
    }
}
```

---

- **Get All Applied Students**

  - **Method:** `GET`
  - **Endpoint:** `/application/getAllAppliedStudents/:internshipId`
  - **Example:** `/application/getAllAppliedStudents/6a15c680e1e1a362e327a292`
  - **Description:** Returns all students who applied for a particular internship. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Successfully fetched all students who applied for the given internship",
    "data": {
       "internshipId": "6a15c680e1e1a362e327a292",
        "totalApplications": 1,
        "allStudentdetails": [
            {
                "applicationId": "6a15ca6be1e1a362e327a2c0",
                "resumeDownloadLink": "http://res.cloudinary.com/dseknlpcn/image/upload/v1779812970/exharo6vw77ursnkeubz.pdf",
                "status": "pending"
            }
        ]
    }
}
```

---

- **Update Application Status**

  - **Method:** `PATCH`
  - **Endpoint:** `/application/updateStatus/:applicationId`
  - **Example:** `/application/updateStatus/6a15ca6be1e1a362e327a2c0`
  - **Description:** Updates the status of a student's internship application and sends an email notification to the student. Authentication required.

  - **Headers:**

```json
{
    "Authorization": "Bearer jwt_token"
}
```

  - **Request Body:**

```json
{
    "status":"accepted"
}
```

  - **Success Response (200):**

```json
{
    "status": true,
    "message": "Application accepted and student notified via email"
}
```  

## 🧪 Testing the Live API

You can explore and test all the API endpoints of this Smart Intern API application using **Postman**, or the **Live API on Render**.

### 🧪 Postman
1. Open Postman.
2. Use the base URL:
   `https://smart-intern-api-7vgk.onrender.com`
3. Test the endpoints described above.
4. Or use the saved Postman collection directly: [Smart-Intern-API Collection](https://www.postman.com/universal-meteor-562580/workspace/my-project/collection/27340893-dcc2eb02-f8a6-4f7d-a70b-efe216b92f78?action=share&source=copy-link&creator=27340893)

---

### 🚀 Live API on Render
The application is deployed and live on Render:

`https://smart-intern-api-7vgk.onrender.com`

> ⚠️ First request may take 30-60 seconds because of the free-tier cold start.

## 💻 Running Smart-Intern-API Application

To run the `Smart-Intern-API` application, follow these steps:

1. **Ensure that you have Node.js and npm installed on your system.**

2. **Clone the repository to your local machine:**

```bash
git clone https://github.com/Dipali127/Smart-Intern-API.git
```

3. **Navigate to the root directory of the project:**

```bash
cd Smart-Intern-API
```

4. **Install dependencies:**

```bash
npm install
```

5. **Create a `.env` file in the root directory and add the following environment variables:**

```env
PORT=3001
MONGO_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
SECRET_KEY=your_secret_key

Cloudinary_Cloud_Name=your_cloudinary_name
Cloudinary_Api_Key=your_cloudinary_api_key
Cloudinary_Api_Secret=your_cloudinary_api_secret

EMAIL=your_gmail_address
EMAIL_PASSWORD=your_google_app_password
```

6. **Start the application:**

```bash
npm start
```

7. **Test APIs using Postman**

## ⚙️ Tech Stack

- **Runtime Environment:** Node.js
- **Backend Framework:** Express.js
- **Database:** MongoDB Atlas
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcrypt
- **AI Integration:** Google Gemini API
- **Cloud Storage:** Cloudinary
- **File Upload Middleware:** multer
- **Resume Parsing:** pdf-parse
- **Email Service:** Nodemailer
- **Similarity Matching:** compute-cosine-similarity
- **Date and Time Management:** moment
- **Environment Variables Management:** dotenv
- **Development Server Monitor:** nodemon

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port |
| `MONGO_URI` | MongoDB Atlas connection string |
| `SECRET_KEY` | JWT secret key for token generation |
| `GEMINI_API_KEY` | Google Gemini AI API key |
| `Cloudinary_Cloud_Name` | Cloudinary cloud name |
| `Cloudinary_Api_Key` | Cloudinary API key |
| `Cloudinary_Api_Secret` | Cloudinary API secret |
| `EMAIL` | Your Google Gmail |
| `EMAIL_PASSWORD` | Google App Password for Nodemailer authentication 




