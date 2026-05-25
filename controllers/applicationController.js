const studentModel = require('../models/studentModel');
const internshipModel = require('../models/internshipModel');
const applicationModel = require('../models/applicationModel');
const validation = require('../validator/validation');
const uploadFileOnCloudinary = require('../fileUpload/cloudinary');
const cosineSimilarity = require("compute-cosine-similarity");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const pdfParse = require('pdf-parse');
const fs = require('fs');
const emailService = require('../emailConfig/emailService');

//Helper function to delete locally stored file
function deleteLocalFile (filePath){
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

//Apply in internship:
const applyInternship = async function (req, res) {
    try {
        const studentId = req.params.studentID;

        //Check if the provided 'studentId' is a valid ObjectId format.
        if (!validation.checkObjectId(studentId)) {
            return res.status(400).send({ status: false, message: "Invalid studentId" });
        }

        const isExistStudent = await studentModel.findById(studentId);
        if (!isExistStudent) {
            return res.status(400).send({ status: false, message: "Student not found" });
        }

        //Check authorization
        if (isExistStudent._id.toString() !== req.decodedToken.studentID) {
            return res.status(403).send({ status: false, message: "Unauthorized to apply for the internship" });
        }

        //Fetch data from request body
        const { internshipId } = req.body;

        if (!validation.checkData(internshipId)) {
            return res.status(400).send({ status: false, message: "internshipId is required" });
        }

        if (!validation.checkObjectId(internshipId)) {
            return res.status(400).send({ status: false, message: "Invalid internshipId" });
        }

        //Check if the internship exists
        const isExistInternship = await internshipModel.findById(internshipId);
        if (!isExistInternship) {
            return res.status(400).send({ status: false, message: "Provided internshipId internship doesn't exist" });
        }

        if (isExistInternship.status !== "active") {
            return res.status(400).send({ status: false, message: "Internship is not active" });
        }

        //Check if the student has already applied for this internship
        const existingApplication = await applicationModel.findOne({ studentId: studentId, internshipId: internshipId });
        if (existingApplication) {
            return res.status(409).send({ status: false, message: "You have already applied for this internship" });
        }

        //Multer stores the uploaded resume file inside req.file
        if (!req.file) {
            return res.status(400).send({ status: false, message: "Resume file is required" });
        }

        const resumePath = req.file.path;

        //Build a mini resume analyzer using google gemini 
        const bufferData = fs.readFileSync(resumePath);
        const parseData = await pdfParse(bufferData);

        //Build prompt to extract technical skills from resume text
        const prompt = `Extract all technical skills from the following resume text.
                         Return the result ONLY as a JSON array of skills.
              Rules:
                  - Include programming languages, frameworks, databases, tools, and technologies.
                  - Do NOT include soft skills.
                  - Do NOT include explanations.
                  - Do NOT include any text outside the array.
                  - Output format must be strictly like: ["Skill1","Skill2","Skill3"]
             Resume Text: ${parseData.text}`;
        
        //Generate AI response using Gemini model to extract technical skills from resume
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);

        const aiText = result.response.text();

        //Parse the extracted skills as JSON array
        const aiSkills = JSON.parse(aiText);
        
        //Use Gemini AI embedding model to convert skills into vector embeddings
        const model1 = genAI.getGenerativeModel({ model: "gemini-embedding-001" })

        //Get embedding for each skills of aiSkills array
        const resumeEmbeddings = await Promise.all(
            aiSkills.map(async skill => {
                const response = await model1.embedContent(skill)
                return response.embedding.values;
    }))

        //Get embedding for each skills of company posted intership skills
        const skillEmbeddings = isExistInternship.skillEmbedding;
        
        //Compare resume skills with internship required skills using cosine similarity
        let matchCount = 0;
        for (let i = 0; i < skillEmbeddings.length; i++) {
            for (let j = 0; j < resumeEmbeddings.length; j++) {
                let similarity = cosineSimilarity(
                    resumeEmbeddings[j],
                    skillEmbeddings[i].embedding
                );
                if (similarity > 0.6) {
                    matchCount++;
                    break;
                }
            }
        }
        
        //Calculate match score and reject if below 60%
        let totalScore = (matchCount / isExistInternship.skillsRequired.length) * 100;
        
       //Delete locally stored file and then return response to student about rejecting their resume 
        if (totalScore < 60) {
            deleteLocalFile(resumePath);
            return res.status(400).send({
                status: false,
                message: `Your resume match score is ${totalScore.toFixed(2)}%. Minimum required is 60%.`
            });
        }

        //Upload the resume file to Cloudinary and get the hosted URL using "retry mechanism"
        let attempts = 0, maxAttempt = 3;
        let cloudinaryResponse;
        while (attempts < maxAttempt) {
            cloudinaryResponse = await uploadFileOnCloudinary(resumePath);
            if (cloudinaryResponse) {
                break;
            }

            attempts++;
        }

        //If all attempts fail, delete local file and return error
        if (!cloudinaryResponse) {
            deleteLocalFile(resumePath);
            return res.status(500).send({ status: false, message: "Failed to upload resume to Cloudinary after 3 attempts" });
        }

        //Remove file from local storage after successful upload
        deleteLocalFile(resumePath);

        //Create the new application object
        const newApplication = {
            studentId: studentId,
            internshipId: internshipId,
            resume: cloudinaryResponse.url
        };

        //Save data of application in database
        const createInternshipApply = await applicationModel.create(newApplication);

        //Send the success response with the new application data
        return res.status(201).send({ status: true, message: "Application Created Successfully", data: createInternshipApply });
    }

    catch (error) {
        if(req.file?.path){
            deleteLocalFile(req.file.path);
        }
        return res.status(500).send({ status: false, message: error.message });
    }

};

//Get all student details who has applied on particular internhsip
const getAllAppliedStudents = async function (req, res) {
    try {
        const internshipId = req.params.internshipId;
        //Check if the provided 'internshipId' is a valid ObjectId format
        if (!validation.checkObjectId(internshipId)) {
            return res.status(400).send({ status: false, message: "Invalid internshipId" });
        }

       //If provided internshipId doesn't exist in the database
        const isExistcompany = await internshipModel.findById(internshipId);
        if (!isExistcompany) {
            return res.status(400).send({ status: false, message: "Provided internship doesn't exist" });
        }

        //Check authorization
        if (isExistcompany.companyId.toString() !== req.decodedToken.companyID) {
            return res.status(403).send({ status: false, message: "Unauthorized company" });
        }

        //If no student has applied on the company provided internship
        const isExistinternship = await applicationModel.find({ internshipId });
        if (isExistinternship.length === 0) {
            return res.status(400).send({ status: false, message: "No applications found for this internship" })
        }

        //Prepare response data with application details
        const data = {
            internshipId: internshipId,
            totalApplications: isExistinternship.length,
            allStudentdetails: isExistinternship.map((student) => {
                return {
                    applicationId: student._id,
                    resumeDownloadLink: student.resume,
                    status: student.status
                };
            })
        }

        return res.status(200).send({
            status: true, message: "Successfully fetched all students who applied for the given internship",
            Data: data,
        })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Update application status and notify student via email
const reviewApplicant = async function (req, res) {
    try {
        const applicationId = req.params.applicationId;
        //Check if the provided 'applicationId' is a valid ObjectId format
        if (!validation.checkObjectId(applicationId)) {
            return res.status(400).send({ status: false, message: "Invalid applicationId" });
        }

        const isExistApplication = await applicationModel.findById({ _id: applicationId });
        if (!isExistApplication) {
            return res.status(404).send({ status: false, message: "Application does not exist" })
        }

        const isExistInternship = await internshipModel.findById({ _id: isExistApplication.internshipId });
        if (!isExistInternship) {
            return res.status(404).send({ status: false, message: "Internship not found" })
        }

        //Check authorization
        if (req.decodedToken.companyID !== isExistInternship.companyId.toString()) {
            return res.status(403).send({ status: false, message: "Unauthorized to review applicants" });
        }

        const status = req.body.status;
        if (!validation.checkData(status)) {
            return res.status(400).send({ status: false, message: "Status is required" });
        }

        if(!["accepted", "rejected"].includes(status)){
            return res.status(400).send({status:false, message: "Status must be accepted or rejected"})
        }

        const isExistStudent = await studentModel.findById({ _id: isExistApplication.studentId });
        if (!isExistStudent) {
            return res.status(404).send({ status: false, message: "Student doesn't exist" });
        }

        //Check if application has already been reviewed
        if (isExistApplication.status !== "pending") {
            return res.status(400).send({ status: false, message: "Application has already been reviewed" });
        }

        //Update application status for a student in applicationModel database
        await applicationModel.findByIdAndUpdate(applicationId, { status: status });

        let message;
        if (status === "accepted") {
            message = `Congratulations! Your application has been accepted.`
        } else {
            message = `We are sorry, your application has been rejected.`
        }
        
        //Call sendEmail method to send email to the student
        await emailService.sendEmail(isExistStudent.email, message);

        return res.status(200).send({
            status: true,
            message: `Application ${status} and student notified via email`
        });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { applyInternship, getAllAppliedStudents, reviewApplicant };
