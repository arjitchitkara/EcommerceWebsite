const productModel = require('../Models/productModel')

const { isValid, keyValid, priceValid, validString} = require('../Validator/validation')

const imgUpload = require("../AWS/aws-S3")
const { isValidObjectId } = require('mongoose')


const createProduct = async function (req, res) {
    try {
        const data = req.body
        const files = req.files

        if (!isValid(files)) return res.status(400).send({ status: false, message: "Please Enter data to Create the Product" })

        const { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = data

        if (!isValid(title)) return res.status(400).send({ status: false, message: "Title is mandatory and should have non empty String" })

        if (await productModel.findOne({ title })) return res.status(400).send({ status: false, message: `This title ${title} is already present please Give another Title` })

        if (!isValid(description)) return res.status(400).send({ status: false, message: "description is mandatory and should have non empty String" })

        if (!isValid(price)) return res.status(400).send({ status: false, message: "Price is mandatory and should have non empty Number" })

        if (!priceValid(price)) return res.status(400).send({ status: false, message: "price should be in  valid Formate with Numbers || Decimals" })

        if (!isValid(currencyId)) return res.status(400).send({ status: false, message: "currencyId is Mandatory and should have non empty Number " })

        if (!/^INR$/.test(currencyId)) return res.status(400).send({ status: false, message: `currencyId Should be in this form 'INR' only` })

        if (!isValid(currencyFormat)) return res.status(400).send({ status: false, message: "currencyFormat is mandatory and should have non empty string" })

        if (!/^₹$/.test(currencyFormat)) return res.status(400).send({ status: false, message: `currencyFormat Should be in this form '₹' only` })

        if (!validString(isFreeShipping)) return res.status(400).send({ status: false, message: "isFreeShipping should have non empty" })
        if (isFreeShipping) {
            if (!/^(true|false)$/.test(isFreeShipping)) return res.status(400).send({ status: false, message: `isFreeShipping Should be in boolean with small letters` })
        }

        if (!keyValid(files)) return res.status(400).send({ status: false, message: "product Image is Mandatory" })

        if (!validString(style)) return res.status(400).send({ status: false, message: "Style should have non empty String" })

        if (!isValid(availableSizes)) return res.status(400).send({ status: false, message: "availableSizes is mandatory and should have non empty String" })

        let size = availableSizes.split(',').map(x => x.trim())

        for (let i = 0; i < size.length; i++) {
            if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size[i]))) return res.status(400).send({ status: false, message: `availableSizes should have only these Sizes ['S' || 'XS'  || 'M' || 'X' || 'L' || 'XXL' || 'XL']` })
        }

        if (!validString(installments)) return res.status(400).send({ status: false, message: "installments should have non empty Number" })
        if (installments) {
            if (!/^\d+$/.test(installments)) return res.status(400).send({ status: false, message: "installments should have only Number" })
        }

        let productImage1 = await imgUpload.uploadFile(files[0])

        let obj = {
            title, description, price, currencyId, currencyFormat, isFreeShipping, productImage: productImage1, style, availableSizes: size, installments
        }

        const newProduct = await productModel.create(obj)

        return res.status(201).send({ status: true, message: "User created successfully", data: newProduct })

    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
}

async function getProducts(req, res) {
    try {
        let filter = req.query;
        let query = { isDeleted: false };


        if (keyValid(filter)) {
            let { name, size, priceSort, price } = filter;

            if (!validString(size)) { return res.status(400).send({ status: false, message: "If you select size than it should have non empty" }) }
            if (size) {
                size = size.toUpperCase()
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size))) return res.status(400).send({ status: false, message: `availableSizes should have only these Sizes ['S' || 'XS'  || 'M' || 'X' || 'L' || 'XXL' || 'XL']` })
                query.availableSizes = size
            }

            if (!validString(name)) return res.status(400).send({ status: false, message: "If you select name than it should have non empty" })
            if (name) {
                const regexName = new RegExp(name, "i");
                query.title = { $regex: regexName };
            }

            if (!validString(price)) return res.status(400).send({ status: false, message: "If you select price than it should have non empty" })
            if (price) {
                price = JSON.parse(price)

                if (!validString(price.priceGreaterThan)) return res.status(400).send({ status: false, message: "If you select priceGreaterThan than it should have non empty" })
                if (price.priceGreaterThan) {
                    if (!priceValid(price.priceGreaterThan)) { return res.status(400).send({ status: false, messsage: "Enter a valid price in priceGreaterThan" }) }
                    query.price = { '$gt': price.priceGreaterThan }
                }

                if (!validString(price.priceLessThan)) return res.status(400).send({ status: false, message: "If you select priceLessThan than it should have non empty" })
                if (price.priceLessThan) {
                    if (!priceValid(price.priceLessThan)) { return res.status(400).send({ status: false, messsage: "Enter a valid price in priceLessThan" }) }
                    query['price'] = { '$lt': price.priceLessThan }
                }
                if (price.priceLessThan && price.priceGreaterThan) {
                    query.price = { '$lte': price.priceLessThan, '$gte': price.priceGreaterThan }
                }
            }

            if (!validString(priceSort)) return res.status(400).send({ status: false, message: "If you select priceSort than it should have non empty" })
            if (priceSort) {
                if ((priceSort == 1 || priceSort == -1)) {
                    let filterProduct = await productModel.find(query).sort({ price: priceSort })

                    if (filterProduct.length == 0) {
                        return res.status(404).send({ status: false, message: "No products found with this query" })
                    }
                    return res.status(200).send({ status: true, message: "Success", "number of products": filterProduct.length, data: filterProduct })
                }
                return res.status(400).send({ status: false, message: "priceSort must have 1 or -1 as input" })
            }
        }

        let data = await productModel.find(query).sort({ price: -1 });

        if (data.length == 0) {
            return res.status(404).send({ status: false, message: "No products found with this query" });
        }

        return res.status(200).send({ status: true, message: "Success", "number of products": data.length, data })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

const getProductById = async function (req, res) {
    try {
        let productId = req.params.productId

        if (!productId) { return res.status(400).send({ ststus: false, msg: "Please enter Product Id in Path Params" }) }
        if (!isValidObjectId(productId)) { return res.status(400).send({ status: false, msg: "Invalid Product Id" }) }
        const product = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!product) { return res.status(404).send({ status: false, messgage: `Product is deleted or Not Available` }) }

        return res.status(200).send({ status: true, msg: "Success", data: product })



    } catch (error) {
        return res.status(500).send({ error: error.message })

    }
}

const updateProduct = async function (req, res) {
    try {
        let productId = req.params.productId

        let body = req.body

        const files = req.files

        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'productId is not valid' })

        let product = await productModel.findById(productId)

        if (!product) return res.status(404).send({ status: false, messgage: 'product not found' })

        if (product.isDeleted == true) return res.status(400).send({ status: false, messgage: `Product is deleted` })

        if (!isValid(files)) return res.status(400).send({ status: false, message: "Please Enter data to update the product" })

        const data = {}
        if (files) {
            if (!validString(body.productImage)) return res.status(400).send({ status: false, message: "please provide product Image" })
            if (files.length > 0) {
                data.productImage = await imgUpload.uploadFile(files[0])
            }
        }

        let { title, description, price, currencyId, currencyFormat, isFreeShipping, style, availableSizes, installments } = body

        if (!validString(title)) return res.status(400).send({ status: false, message: "title can not be empty" })
        if (title) {
            if (await productModel.findOne({ title })) return res.status(400).send({ status: false, message: `This title ${title} is already present please Give another Title` })
            data.title = title
        }

        if (!validString(description)) return res.status(400).send({ status: false, message: "description can not be empty" })
        if (description) {

            data.description = description
        }

        if (!validString(price)) return res.status(400).send({ status: false, message: "price can not be empty" })
        if (price) {

            if (!priceValid(price)) return res.status(400).send({ status: false, message: "price should be in  valid Formate with Numbers || Decimals" })

            data.price = price
        }

        if (!validString(currencyId)) return res.status(400).send({ status: false, message: "currencyId can not be empty" })
        if (currencyId) {

            if (!/^INR$/.test(currencyId)) return res.status(400).send({ status: false, message: `currencyId Should be in this form 'INR' only` })

            data.currencyId = currencyId
        }

        if (!validString(currencyFormat)) return res.status(400).send({ status: false, message: "currencyFormat can not be empty" })
        if (currencyFormat) {

            if (!/^₹$/.test(currencyFormat)) return res.status(400).send({ status: false, message: `currencyFormat Should be in this form '₹' only` })

            data.currencyFormat = currencyFormat
        }

        if (!validString(isFreeShipping)) return res.status(400).send({ status: false, message: "isFreeShipping can not be empty" })
        if (isFreeShipping) {

            if (!/^(true|false)$/.test(isFreeShipping)) return res.status(400).send({ status: false, message: `isFreeShipping Should be in boolean with small letters` })
            data.isFreeShipping = isFreeShipping
        }

        if (!validString(style)) return res.status(400).send({ status: false, message: "style can not be empty" })
        if (style) {
            data.style = style
        }

        if (!validString(availableSizes)) return res.status(400).send({ status: false, message: "availableSizes can not be empty" })
        if (availableSizes) {
            availableSizes = availableSizes.toUpperCase()
            let size = availableSizes.split(',').map(x => x.trim())

            for (let i = 0; i < size.length; i++) {
                if (!(["S", "XS", "M", "X", "L", "XXL", "XL"].includes(size[i]))) return res.status(400).send({ status: false, message: `availableSizes should have only these Sizes ['S' || 'XS'  || 'M' || 'X' || 'L' || 'XXL' || 'XL']` })

            }
            data['$addToSet'] = {}
            data['$addToSet']['availableSizes'] = size

        }

        if (!validString(installments)) return res.status(400).send({ status: false, message: "installments can not be empty" })
        if (installments) {

            if (!/^\d+$/.test(installments)) return res.status(400).send({ status: false, message: "installments should have only Number" })

            data.installments = installments
        }

        const newProduct = await productModel.findByIdAndUpdate(productId, data, { new: true })

        return res.status(200).send({ status: true, message: "Success", data: newProduct })

    } catch (error) {
        return res.status(500).send({ error: error.message })
    }
}


async function deleteProductById(req, res) {
    try {
        let productId = req.params.productId
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: 'productId is not valid' })
        let data = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!data) return res.status(404).send({ status: true, message: "No products found or may be deleted already" });

        await productModel.findByIdAndUpdate(productId, { isDeleted: true, deletedAt: Date() })
        return res.status(200).send({ status: true, message: "Deleted Successfully" });

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}

module.exports = { createProduct, getProducts, getProductById, updateProduct, deleteProductById }