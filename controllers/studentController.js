const studentModel = require('../models/studentModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const validation = require('../validator/validation');
const moment = require('moment');

//Register student details:
const registerStudent = async function (req, res) {
    try {
        const data = req.body;
        //Check if request body is empty
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide details for registration" });
        }

        const { name, email, password, mobileNumber } = data;

        //Validate mandatory details
        if (!validation.checkData(name)) {
            return res.status(400).send({ status: false, message: "StudentName is required" })
        }

        if (!validation.checkName(name)) {
            return res.status(400).send({ status: false, message: "Invalid name" })
        }

        if (!validation.checkData(email)) {
            return res.status(400).send({ status: false, message: "Email is required" });
        }

        if (!validation.checkEmail(email)) {
            return res.status(400).send({ status: false, message: "Invalid email" })
        }

        //Check if the provided email already exists in the database
        const existingEmail = await studentModel.findOne({ email: email });
        if (existingEmail) {
            return res.status(409).send({ status: false, message: "The provided email already exists" })
        }

        if (!validation.checkData(password)) {
            return res.status(400).send({ status: false, message: "Password is required" });
        }

        if (!validation.checkPassword(password)) {
            return res.status(400).send({ status: false, message: "Invalid password" });
        }

        //Hash the password before saving it in database
        const encryptPassword = await bcrypt.hash(password, 10)

        if (!validation.checkData(mobileNumber)) {
            return res.status(400).send({ status: false, message: "MobileNumber is required" });
        }

        if (!validation.validateInput(mobileNumber)) {
            return res.status(400).send({ status: false, message: "Invalid MobileNumber" });
        }

        const uniqueMobile = await studentModel.findOne({ mobileNumber: mobileNumber });
        if (uniqueMobile) {
            return res.status(409).send({ status: false, message: "Provided mobile number already exist" });
        }

        //Prepare the new student details with the encrypted password
        const newDetails = {
            name: name,
            email: email,
            password: encryptPassword,
            mobileNumber: mobileNumber
        }

        const createStudent = await studentModel.create(newDetails);
        //Create new javascript object from mongoose document to hide password

        const newStudentResponse = createStudent.toObject();
        delete newStudentResponse.password;

        return res.status(201).send({ status: true, message: "Student registered successfully", data: newStudentResponse });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

//Student login:
const studentLogin = async function (req, res) {
    try {
        const data = req.body;
        //Check if request body is empty 
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide details for login" });
        }

        const { email, password } = data;

        if (!validation.checkData(email)) {
            return res.status(400).send({ status: false, message: "Provide email for login" })
        }

        if (!validation.checkEmail(email)) {
            return res.status(400).send({ status: false, message: "Invalid email" });
        }

        //Check if the provided email doesn't exist in database
        const isemailExist = await studentModel.findOne({ email: email });
        if (!isemailExist) {
            return res.status(404).send({ status: false, message: "Email not found" });
        }

        if (!validation.checkData(password)) {
            return res.status(400).send({ status: false, message: "Provide password for login" });
        }

        if (!validation.checkPassword(password)) {
            return res.status(400).send({ status: false, message: "Invalid password" });
        }

        //Compare hashed Password with the student provided password
        const comparePassword = await bcrypt.compare(password, isemailExist.password);
        if (!comparePassword) {
            return res.status(401).send({ status: false, message: "Incorrect password" })
        }

        //Generate token for student
        const token = jwt.sign({
            studentID: isemailExist._id.toString(),
            user: "student"
        }, process.env.SECRET_KEY, { expiresIn: "1h" })

        //Send the generated token in the response header
        res.set('Authorization', `Bearer ${token}`)

        return res.status(200).send({ status: true, message: "Student logged in successfully", token: token });
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

//Edit student details:
//Note: This API is triggered/invoked when student applies to internship (not profile editing)
const editStudentdetails = async function (req, res) {
    try {
        //Fetch the studentID from the route parameters
        const studentId = req.params.studentID;
        //Check if the provided 'studentId' is a valid ObjectId format.
        if (!validation.checkObjectId(studentId)) {
            return res.status(400).send({ status: false, message: "Invalid studentId" });
        }

        const isExiststudent = await studentModel.findById(studentId);
        if (!isExiststudent) {
            return res.status(404).send({ status: false, message: "Student not found" });
        }

        //Check authorization
        if (isExiststudent._id.toString() !== req.decodedToken.studentID) {
            return res.status(403).send({ status: false, message: "Unauthorized to update student details" });
        }

        const data = req.body;
        if (validation.isEmpty(data)) {
            return res.status(400).send({ status: false, message: "Provide data to edit/update student details" })
        }

        const { DOB, collegeName, yearOfPassout, areaOfInterest, address } = data;

        if (!validation.checkData(DOB)) {
            return res.status(400).send({ status: false, message: "DOB is required" });
        }

        //Parsing DOB using moment.js
        const parsedDOB = moment(DOB, 'YYYY-MM-DD', true);

        if (!parsedDOB.isValid()) {
            return res.status(400).send({ status: false, message: "Invalid date format" });
        }

        if (!validation.checkData(collegeName)) {
            return res.status(400).send({ status: false, message: "CollegeName is required" });
        }

        if (!validation.checkData(yearOfPassout)) {
            return res.status(400).send({ status: false, message: "YearOfPassout is required" });
        }

        //Check if yearOfPassout is not a number
        if (!validation.validateInput(yearOfPassout)) {
            return res.status(400).send({ status: false, message: "YearOfPassout must be a number" });
        }

        if (!validation.checkData(areaOfInterest)) {
            return res.status(400).send({ status: false, message: "AreaOfInterest is required" });
        }

        if (!address || typeof address !== 'object') {
            return res.status(400).send({ status: false, message: "Address is required and must be an object" });
        }

        if (!validation.checkData(address.country)) {
            return res.status(400).send({ status: false, message: "Country is required" });
        }

        if (!validation.checkData(address.state)) {
            return res.status(400).send({ status: false, message: "State is required" });
        }

        if (!validation.checkData(address.city)) {
            return res.status(400).send({ status: false, message: "City is required" });
        }

        //Prepare the new edit/update details 
        const additionalData = {
            DOB: parsedDOB,
            collegeName,
            yearOfPassout,
            areaOfInterest,
            address: {
                country: address.country,
                state: address.state,
                city: address.city
            }
        }

        //Save the edit student record in the database
        const updateDetails = await studentModel.findOneAndUpdate({ _id: studentId },
            additionalData, { new: true });

        //Create new javascript object from mongoose document to hide student's password
        const updatedResponse = updateDetails.toObject();
        delete updatedResponse.password;

        return res.status(200).send({ status: true, message: "Student details updated successfully", data: updatedResponse });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message });
    }
}

module.exports = { registerStudent, studentLogin, editStudentdetails };