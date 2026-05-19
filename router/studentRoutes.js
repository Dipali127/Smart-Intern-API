const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController')
const jwt = require('../middleware/auth')

//Route to register a new student
router.post('/register', studentController.registerStudent)

//Route to login a student
router.post('/login', studentController.studentLogin)

//Route to update student details (requires authentication)
router.put('/update/:studentID', jwt.authentication,studentController.editStudentdetails)

module.exports = router;