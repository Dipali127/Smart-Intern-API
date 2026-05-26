const internshipModel = require('../models/internshipModel');
const companyModel = require('../models/companyModel');
const validation = require('../validator/validation');
const moment = require('moment');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//Generate AI Description for internship post:
const generateAIDescription = async function (req, res) {
    try {
        const data = req.body;
        if (validation.isEmpty(data)) {
            return res.status(400).send({
                status: false, message:
                    "Provide data to generate AI description about internship post"
            });
        }

        const { position, skillsRequired, description } = data;
        //Validate required fields
        if (!validation.checkData(position)) {
            return res.status(400).send({ status: false, message: "Position is required" });
        }

        if (!Array.isArray(skillsRequired) || skillsRequired.length === 0) {
            return res.status(400).send({ status: false, message: "SkillsRequired is required" });
        }

        //Build prompt for Gemini AI
        let prompt = description;
        if (!validation.checkData(description)) {
            prompt = `Generate a short, professional, and engaging internship description (around 2-3 
            lines) for the position of ${position}, requiring skills in ${skillsRequired.join(", ")}.`
        }

        //Logic to generate AI description about internship post
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        const aiText = result.response.text();

        return res.status(200).send({
            status: true, message: "AI Description generated successfully",
            data: aiText
        })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Create internship:
const postInternship = async function (req, res) {
    try {
        const companyId = req.params.companyId;
        //Check if the provided 'companyId' is a valid ObjectId format
        if (!validation.checkObjectId(companyId)) {
            return res.status(400).send({ status: false, message: "Invalid companyId" });
        }

        const isExistcompany = await companyModel.findById(companyId);

        //If provided companyId doesn't exist in the database
        if (!isExistcompany) {
            return res.status(404).send({ status: false, message: "Company not found" });
        }

        //Check authorization
        if (isExistcompany._id.toString() !== req.decodedToken.companyID) {
            return res.status(403).send({ status: false, message: "Unauthorized to post internship details" });
        }

        let data = req.body;
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide data to post internship" });
        }

        const { category, position, description, internshipType, skillsRequired, eligibility, duration, location, applicationDeadline,
            numberOfOpenings, stipend, status } = data;

        //Validate mandatory details
        if (!validation.checkData(category)) {
            return res.status(400).send({ status: false, message: "Category is required" });
        }

        if (!validation.checkData(position)) {
            return res.status(400).send({ status: false, message: "Position is required" });
        }

        if (!validation.checkData(description)) {
            return res.status(400).send({ status: false, message: "Description is required" })
        }

        if (!Array.isArray(skillsRequired) || skillsRequired.length === 0) {
            return res.status(400).send({ status: false, message: "SkillsRequired is required and must be in array format" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

        //Get embedding for each skills of company posted internship skills
        const skillEmbedding = await Promise.all(
            skillsRequired.map(async (skill) => {
                const response = await model.embedContent(skill);

                return {
                    skill: skill,
                    embedding: response.embedding.values
                }

            }

            )
        )

        if (!validation.checkData(eligibility)) {
            return res.status(400).send({ status: false, message: "Eligibility is required" });
        }

        if (!validation.checkData(duration)) {
            return res.status(400).send({ status: false, message: "Duration is required" });
        }

        if (!location || typeof location !== 'object') {
            return res.status(400).send({ status: false, message: "Location is required and must be an object" });
        }

        if (!validation.checkData(location.country)) {
            return res.status(400).send({ status: false, message: "Country is required" })
        }

        if (!validation.checkData(location.state)) {
            return res.status(400).send({ status: false, message: "State is required" })
        }

        if (!validation.checkData(location.city)) {
            return res.status(400).send({ status: false, message: "City is required" });
        }

        if (!validation.checkData(applicationDeadline)) {
            return res.status(400).send({ status: false, message: "ApplicationDeadline is required" });
        }

        //Parsing the lastDateofAppling using moment.js in 'YYYY-MM-DD' format.
        const lastDateofApplying = moment(applicationDeadline, 'YYYY-MM-DD', true);

        //Check if the parsed date is valid
        if (!lastDateofApplying.isValid()) {
            return res.status(400).send({ status: false, message: "Invalid date format" });
        }

        //Get the current date
        const currentDate = moment();
        if (!lastDateofApplying.isAfter(currentDate)) {
            return res.status(400).send({ status: false, message: "Application deadline must be in the future." })
        }

        if (!numberOfOpenings) {
            return res.status(400).send({ status: false, message: "NumberOfOpenings is required" });
        }

        //numberOfOpenings should be a valid numeric value
        if (!validation.validateInput(numberOfOpenings)) {
            return res.status(400).send({ status: false, message: "Invalid numberOfOpenings" });
        }

        if (!validation.checkData(stipend)) {
            return res.status(400).send({ status: false, message: "Stipend is required" });
        }

        if (!validation.validateSalaryFormat(stipend)) {
            return res.status(400).send({
                status: false,
                message: "Invalid stipend format. Use format: 5000-10000"
            });
        }

        const [minimumStipend, maximumStipend] = stipend.split('-');

        //Check if status is provided and validate it only if it is sent by company
        if (status && !["active", "closed"].includes(status)) {
            return res.status(400).send({ status: false, message: "Invalid status value" });
        }

        // Prepare the new internship details to save in the database
        const newInternship = {
            companyId: isExistcompany._id,
            category,
            position,
            description,
            internshipType,
            skillsRequired,
            skillEmbedding,
            eligibility,
            duration,
            location,
            applicationDeadline: lastDateofApplying,
            numberOfOpenings,
            stipend: `${minimumStipend}-${maximumStipend}`,
            status
        }

        const createInternship = await internshipModel.create(newInternship);

        //Create new javascript object from mongoose document to hide skillEmbedding
        const newInternshipResponse = createInternship.toObject()
        delete newInternshipResponse.skillEmbedding;

        return res.status(201).send({ status: true, message: "Internship posted successfully", data: newInternshipResponse });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Update internship:
const updateInternship = async function (req, res) {
    try {
        const internshipId = req.params.internshipId;
        //Check if the provided 'internshipId' is a valid ObjectId format
        if (!validation.checkObjectId(internshipId)) {
            return res.status(400).send({ status: false, message: "Invalid internshipId" });
        }

        const isExistInternship = await internshipModel.findById(internshipId);
        if (!isExistInternship) {
            return res.status(404).send({ status: false, message: "Internship not found" });
        }

        //Check if the logged-in company is authorized to update the internship details
        if (isExistInternship.companyId.toString() !== req.decodedToken.companyID) {
            return res.status(403).send({ status: false, message: "Unauthorized to update internship details" });
        }

        const data = req.body;
        //Check if request body is empty 
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "No fields provided for update" });
        }

        const { status, internshipType, duration, skillsRequired } = data;
        let updateData = {};

        //Validate mandatory fields
        if (status) {
            if (!["active", "closed"].includes(status)) {
                return res.status(400).send({ status: false, message: "Invalid status value" })
            }

            updateData.status = status;
        }

        if (internshipType) {
            if (!["remote", "wfh", "wfo"].includes(internshipType)) {
                return res.status(400).send({ status: false, message: "Invalid internshipType value" })
            }

            updateData.internshipType = internshipType;
        }

        if (duration) {
            updateData.duration = duration;
        }

        if (skillsRequired) {
            if (!Array.isArray(skillsRequired)) {
                return res.status(400).send({ status: false, message: "Invalid skillsRequired format" });
            }

            const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

            //Get embedding for each new skills of updated by company
            const newSkillEmbedding = await Promise.all(
                skillsRequired.map(async (skill) => {
                    const response = await model.embedContent(skill);

                    return {
                        skill: skill,
                        embedding: response.embedding.values
                    }

                }

                )
            )

            //Add all multiple skills at once, but only add the ones that do not already exist in the array
            updateData.$addToSet = {
                skillsRequired: { $each: skillsRequired },
                skillEmbedding: { $each: newSkillEmbedding }
            };
        }

        //Update the internship
        const updatedInternship = await internshipModel.findOneAndUpdate({ _id: internshipId }, updateData, { new: true });

        //Create new javascript object from mongoose document to hide skillEmbedding
        const newInternshipResponse = updatedInternship.toObject()
        delete newInternshipResponse.skillEmbedding;

        return res.status(200).send({ status: true, message: "updated Successfully", data: newInternshipResponse })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Get internship:
const getInternship = async function (req, res) {
    try {
        //Extract query from request parameter
        const filter = req.query;
        //Pagination:
        const page = Number(filter.page) || 1;
        const limit = Number(filter.limit) || 2;
        const skip = (page - 1) * limit;

        let query = { status: "active" };
        //If student provides query parameters
        if (filter.category) { query.category = filter.category };
        if (filter.position) { query.position = filter.position };
        if (filter.internshipType) { query.internshipType = filter.internshipType };
        if (filter.location) {
            if (filter.location.country) query['location.country'] = filter.location.country;
            if (filter.location.state) query['location.state'] = filter.location.state;
            if (filter.location.city) query['location.city'] = filter.location.city;
        }

        //Get all internships based on the provided query
        const fetchInternship = await internshipModel.find(query).populate('companyId').skip(skip).limit(limit);

        //Format the response to include company name along with other internship details
        const formattedInternships = fetchInternship.map(internship => {
            return {
                By: internship.companyId.companyName,
                category: internship.category,
                position: internship.position,
                status: internship.status
            };
        });

        return res.status(200).send({ status: true, message: "Internship fetched successfully", data: formattedInternships });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Get internship by id:
const getInternshipById = async function (req, res) {
    try {
        //Extracted internshipId from request parameters
        const internshipId = req.params.internshipId;
        if (!validation.checkObjectId(internshipId)) {
            return res.status(400).send({ status: false, message: "Invalid internshipId" });
        }

        const isexistInternship = await internshipModel.findById(internshipId).populate('companyId');
        if (!isexistInternship) {
            return res.status(404).send({ status: false, message: "Internship not found" });
        }

        if (isexistInternship.status !== "active") {
            return res.status(400).send({ status: false, message: "Internship is not active" });
        }

        const formattedInternships = {
            companyName: isexistInternship.companyId.companyName,
            companyEmail: isexistInternship.companyId.companyEmail,
            companyContact: isexistInternship.companyId.contactNumber,
            category: isexistInternship.category,
            position: isexistInternship.position,
            internshipType: isexistInternship.internshipType,
            skillsRequired: isexistInternship.skillsRequired,
            eligibility: isexistInternship.eligibility,
            duration: isexistInternship.duration,
            location: isexistInternship.location,
            applicationDeadline: isexistInternship.applicationDeadline,
            numberOfOpenings: isexistInternship.numberOfOpenings,
            stipend: isexistInternship.stipend,
            status: isexistInternship.status
        }

        return res.status(200).send({ status: true, message: "Internship fetched successfully", data: formattedInternships })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}
module.exports = { generateAIDescription, postInternship, updateInternship, getInternship, getInternshipById }