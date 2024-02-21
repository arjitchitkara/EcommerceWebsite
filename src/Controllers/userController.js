const userModel = require("../Models/userModel")
const { isValid, isValidName, isvalidEmail, isvalidMobile, isValidPassword, pincodeValid, keyValid, validString } = require('../Validator/validation')

const imgUpload = require("../AWS/aws-S3")

const bcrypt = require('bcrypt')

const jwt = require('jsonwebtoken')

const { isValidObjectId } = require("mongoose")

const createUser = async function (req, res) {
    try {
        const data = req.body
        const files = req.files

        if (!isValid(files)) return res.status(400).send({ status: false, message: "Please Enter data to Create the User" })

        const { fname, lname, email, phone, password, address } = data

        if (!isValid(fname)) return res.status(400).send({ status: false, message: "fname is mandatory and should have non empty String" })

        if (!isValidName.test(fname)) return res.status(400).send({ status: false, message: "Please Provide fname in valid formate and Should Starts with Capital Letter" })

        if (!isValid(lname)) return res.status(400).send({ status: false, message: "lname is mandatory and should have non empty String" })

        if (!isValidName.test(lname)) return res.status(400).send({ status: false, message: "Please Provide lname in valid formate and Should Starts with Capital Letter" })

        if (!isValid(email)) return res.status(400).send({ status: false, message: "email is mandatory and should have non empty String" })

        if (!isvalidEmail.test(email)) return res.status(400).send({ status: false, message: "email should be in  valid Formate" })

        if (await userModel.findOne({ email })) return res.status(400).send({ status: false, message: "This email is already Registered Please give another Email" })

        if (!keyValid(files)) return res.status(400).send({ status: false, message: "profile Image is Mandatory" })

        if (!isValid(phone)) return res.status(400).send({ status: false, message: "Phone is mandatory and should have non empty Number" })

        if (!isvalidMobile.test(phone)) return res.status(400).send({ status: false, message: "please provide Valid phone Number with 10 digits starts with 6||7||8||9" })

        if (await userModel.findOne({ phone })) return res.status(400).send({ status: false, message: "This Phone is already Registered Please give another Phone" })

        if (!isValid(password)) return res.status(400).send({ status: false, message: "Password is mandatory and should have non empty String" })

        if (!isValidPassword(password)) return res.status(400).send({ status: false, message: "please provide Valid password with 1st letter should be Capital letter and contains spcial character with Min length 8 and Max length 15" })

        if (!isValid(address)) return res.status(400).send({ status: false, message: "Address is mandatory" })

        const addressParse = JSON.parse(address)

        if (addressParse.shipping) {
            if (!keyValid(addressParse.shipping)) return res.status(400).send({ status: false, message: "Please provide address for Shipping" })

            if (!isValid(addressParse.shipping.street)) return res.status(400).send({ status: false, message: "Street is mandatory and should have non empty String in Shipping" })

            if (!isValid(addressParse.shipping.city)) return res.status(400).send({ status: false, message: "city is mandatory and should have non empty String in Shipping" })

            if (!isValid(addressParse.shipping.pincode)) return res.status(400).send({ status: false, message: "pincode is mandatory and should have non empty String in Shipping" })

            if (!pincodeValid.test(addressParse.shipping.pincode)) return res.status(400).send({ status: false, message: "Please provide valid Pincode with min 4 number || max 6 number in Shipping" })
        } else {
            return res.status(400).send({ status: false, message: "Please provide address for Shipping" })
        }

        if (addressParse.billing) {
            if (!keyValid(addressParse.billing)) return res.status(400).send({ status: false, message: "Please provide address for billing" })

            if (!isValid(addressParse.billing.street)) return res.status(400).send({ status: false, message: "Street is mandatory and should have non empty String in billing" })

            if (!isValid(addressParse.billing.city)) return res.status(400).send({ status: false, message: "city is mandatory and should have non empty String in billing" })

            if (!isValid(addressParse.billing.pincode)) return res.status(400).send({ status: false, message: "pincode is mandatory and should have non empty String in billing" })

            if (!pincodeValid.test(addressParse.billing.pincode)) return res.status(400).send({ status: false, message: "Please provide valid Pincode with min 4 number || max 6 number in billing" })

        } else {
            return res.status(400).send({ status: false, message: "Please provide address for billing" })
        }

        let profileImage1 = await imgUpload.uploadFile(files[0])

        const encyptPassword = await bcrypt.hash(password, 10)

        let obj = {
            fname, lname, email, profileImage: profileImage1, phone, password: encyptPassword, address: addressParse
        }

        const newUser = await userModel.create(obj)

        return res.status(201).send({ status: true, message: "User created successfully", data: newUser })

    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
}

const loginUser = async function (req, res) {
    try {
        let data = req.body
        const { email, password } = data
        //=====================Checking the validation=====================//
        if (!keyValid(data)) return res.status(400).send({ status: false, msg: "Email and Password Required !" })

        //=====================Validation of EmailID=====================//
        if (!email) return res.status(400).send({ status: false, msg: "email is required" })


        //=====================Validation of Password=====================//
        if (!password) return res.status(400).send({ status: false, msg: "password is required" })

        //===================== Checking User exsistance using Email and password=====================//
        const user = await userModel.findOne({ email: email })
        if (!user) return res.status(400).send({ status: false, msg: "Email is Invalid Please try again !!" })

        const verifyPassword = await bcrypt.compare(password, user.password)

        if (!verifyPassword) return res.status(400).send({ status: false, msg: "Password is Invalid Please try again !!" })


        //===================== Creating Token Using JWT =====================//
        const token = jwt.sign({
            userId: user._id.toString()
        }, "this is a private key", { expiresIn: '25h' })

        res.setHeader("x-api-key", token)

        let obj = {
            userId: user._id,
            token: token
        }

        res.status(200).send({ status: true, message: "User login successfull", data: obj })
    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}




let getById = async (req, res) => {
    try {

        const UserIdData = req.params.userId

        const decodedToken = req.decodedToken

        if (!isValidObjectId(UserIdData)) return res.status(400).send({ status: false, message: 'userId is not valid' })

        let user = await userModel.findById(UserIdData)

        if (!user) return res.status(404).send({ status: false, messgage: ' user not found' })

        if (UserIdData !== decodedToken) return res.status(401).send({ status: false, messgage: 'Unauthorized access!' })

        return res.status(200).send({ status: true, message: 'User profile details', data: user })
    }
    catch (error) {
        return res.status(500).send({ status: false, error: error.message })
    }
}




const updateUser = async function (req, res) {
    try {
        let userId = req.params.userId
        let body = req.body
        const decodedToken = req.decodedToken

        const files = req.files
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: 'userId is not valid' })

        let user = await userModel.findById(userId)

        if (!user) return res.status(404).send({ status: false, messgage: ' user not found' })

        if (userId !== decodedToken) return res.status(403).send({ status: false, messgage: `Unauthorized access!, You can't update user profile` })

        if (!isValid(files)) return res.status(400).send({ status: false, message: "Please Enter data to update the User" })

        const data = {}
        if (files) {
            if (!validString(body.profileImage)) return res.status(400).send({ status: false, message: "please provide profile image" })
            if (files.length > 0) {
                data.profileImage = await imgUpload.uploadFile(files[0])
            }
        }

        const { fname, lname, email, phone, password, address } = body

        if (!validString(fname)) return res.status(400).send({ status: false, message: "fname can not be empty" })
        if (fname) {
            if (!isValidName.test(fname)) return res.status(400).send({ status: false, message: "Please Provide fname in valid formate and Should Starts with Capital Letter" })
            data.fname = fname
        }

        if (!validString(lname)) return res.status(400).send({ status: false, message: "lname can not be empty" })
        if (lname) {
            if (!isValidName.test(lname)) return res.status(400).send({ status: false, message: "Please Provide lname in valid formate and Should Starts with Capital Letter" })
            data.lname = lname
        }

        if (!validString(email)) return res.status(400).send({ status: false, message: "Email can not be empty" })
        if (email) {
            if (!isvalidEmail.test(email)) return res.status(400).send({ status: false, message: "email should be in  valid Formate" })
            if (await userModel.find({ email })) return res.status(400).send({ status: false, message: `Unable to update email. ${email} is already registered.` })
            data.email = email
        }

        if (!validString(phone)) return res.status(400).send({ status: false, message: "phone can not be empty" })
        if (phone) {
            if (!isvalidMobile.test(phone)) return res.status(400).send({ status: false, message: "please provide Valid phone Number with 10 digits starts with 6||7||8||9" })
            if (await userModel.findOne({ phone })) return res.status(400).send({ status: false, message: `Unable to update phone. ${phone} is already registered.` })
            data.phone = phone
        }

        if (!validString(password)) return res.status(400).send({ status: false, message: "password can not be empty" })
        if (password) {
            if (!isValidPassword(password)) return res.status(400).send({ status: false, message: "please provide Valid password with 1st letter should be Capital letter and contains spcial character with Min length 8 and Max length 15" })
            data.password = await bcrypt.hash(password, 10)
        }

        if (!validString(address)) return res.status(400).send({ status: false, message: "address can not be empty" })
        if (address) {
            data.address = user.address
            const addressParse = JSON.parse(address)

            if (addressParse.shipping) {
                if (!validString(addressParse.shipping.street)) return res.status(400).send({ status: false, message: "Street can not be empty in Shipping" })
                if (addressParse.shipping.street) { data.address.shipping.street = addressParse.shipping.street }

                if (!validString(addressParse.shipping.city)) return res.status(400).send({ status: false, message: "City can not be empty in Shipping" })
                if (addressParse.shipping.city) { data.address.shipping.city = addressParse.shipping.city }

                if (!validString(addressParse.shipping.pincode)) return res.status(400).send({ status: false, message: "Pincode can not be empty in Shipping" })
                if (!pincodeValid.test(addressParse.shipping.pincode)) return res.status(400).send({ status: false, message: "Please provide valid Pincode with min 4 number || max 6 number in Shipping" })
                if (addressParse.shipping.pincode) { data.address.shipping.pincode = addressParse.shipping.pincode }

            }
            if (addressParse.billing) {

                if (!validString(addressParse.billing.street)) return res.status(400).send({ status: false, message: "Street can not be empty in billing" })
                if (addressParse.billing.street) { data.address.billing.street = addressParse.billing.street }

                if (!validString(addressParse.billing.city)) return res.status(400).send({ status: false, message: "City can not be empty in billing" })
                if (addressParse.billing.street) { data.address.billing.street = addressParse.billing.street }


                if (!validString(addressParse.billing.pincode)) return res.status(400).send({ status: false, message: "Pincode can not be empty in billing" })
                if (!pincodeValid.test(addressParse.billing.pincode)) return res.status(400).send({ status: false, message: "Please provide valid Pincode with min 4 number || max 6 number in billing" })
                if (addressParse.billing.street) { data.address.billing.street = addressParse.billing.street }

            }
        }

        const newUser = await userModel.findByIdAndUpdate(userId, data, { new: true })

        return res.status(200).send({ status: true, message: "User updated successfully", data: newUser })

    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
}


module.exports = { createUser, loginUser, updateUser, getById }
