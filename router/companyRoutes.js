const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

//Route to register a new company
router.post('/register', companyController.registerCompany)

//Route to login a company
router.post('/login', companyController.companyLogin)

module.exports = router;