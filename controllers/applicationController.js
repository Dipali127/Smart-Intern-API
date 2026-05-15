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

        if (isExistStudent._id.toString() !== req.decodedToken.studentID) {
            return res.status(403).send({ status: false, message: "Unauthorized to apply for the internship" });
        }

        //Fetch data from request body
        const { internshipId } = req.body;

        if (!validation.checkData(internshipId)) {
            return res.status(400).send({ status: false, message: "internshipid is required" });
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

        const prompt = `Extract all technical skills from the following resume text.
                         Return the result ONLY as a JSON array of skills.
              Rules:
                  - Include programming languages, frameworks, databases, tools, and technologies.
                  - Do NOT include soft skills.
                  - Do NOT include explanations.
                  - Do NOT include any text outside the array.
                  - Output format must be strictly like: ["Skill1","Skill2","Skill3"]
             Resume Text: ${parseData.text}`;


        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const aiText = result.response.text();
        const aiSkills = JSON.parse(aiText);

        const model1 = genAI.getGenerativeModel({ model: "gemini-embedding-001" })
        //Get embedding for each skills of aiSkills array
        const resumeEmbeddings = await Promise.all(
            aiSkills.map(skill => model1.embedContent(skill))
        );

        //Get embedding for each skills of company posted intership skills
        const skillEmbeddings = await Promise.all(
            isExistInternship.skillsRequired.map(skill => model1.embedContent(skill))
        )

        let matchCount = 0;
        for (let i = 0; i < skillEmbeddings.length; i++) {
            for (let j = 0; j < resumeEmbeddings.length; j++) {
                let similarity = cosineSimilarity(
                    resumeEmbeddings[j].embedding.values,
                    skillEmbeddings[i].embedding.values
                );
                if (similarity > 0.6) {
                    matchCount++;
                    break;
                }
            }
        }

        console.log(matchCount);
        console.log(isExistInternship.skillsRequired.length)
        let totalScore = (matchCount / isExistInternship.skillsRequired.length) * 100;
        if (totalScore < 60) {
            return res.status(400).send({
                status: false,
                message: `Your resume match score is ${totalScore.toFixed(2)}%. Minimum required is 60%.`
            });
        }
        console.log(totalScore)

        //Upload the resume file to Cloudinary and get the hosted URL
        const cloudinaryResponse = await uploadFileOnCloudinary(resumePath);
        if (!cloudinaryResponse) {
            return res.status(500).send({ status: false, message: "Failed to upload resume to Cloudinary" });
        }

        //Remove file from local storage after successful upload
        if (fs.existsSync(resumePath)) {
            fs.unlinkSync(resumePath);
        }

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

        //if provided internshipId doesn't exist
        const isExistcompany = await internshipModel.findById(internshipId);
        if (!isExistcompany) {
            return res.status(400).send({ status: false, message: "Provided internship doesn't exist" });
        }

        //Check authorization
        if (isExistcompany.companyId != req.decodedToken.companyID) {
            return res.status(403).send({ status: false, message: "Unauthorized company" });
        }

        //If no student has applied on the company provided internship
        const isExistinternship = await applicationModel.find({ internshipId });
        if (isExistinternship.length === 0) {
            return res.status(400).send({ status: false, message: "No applications found for this internship" })
        }

        //response data
        const data = {
            internshipId: internshipId,
            totalApplications: isExistinternship.length,
            allStudentdetails: isExistinternship.map((student) => {
                return {
                    resumeDownloadLink: student.resume
                };
            })
        }

        return res.status(200).send({
            status: true, message: "successfully fetched all student who applied for internship of given internship",
            Data: data,
        })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { applyInternship, getAllAppliedStudents };
