const { isValidObjectId } = require("mongoose");
const cartModel = require("../Models/cartModel");
const productModel = require("../Models/productModel");
const userModel = require("../Models/userModel");
const { isValid, keyValid } = require("../Validator/validation");


async function addToCart(req, res) {
    try {
        let userId = req.params.userId
        let decodedToken = req.decodedToken
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Invalid UserId" })

        if (userId !== decodedToken) return res.status(403).send({ status: false, messgage: "Unauthorized access!, You can't create or add to other user cart" })

        let checkUserId = await userModel.findById(userId)
        if (!checkUserId) return res.status(404).send({ status: false, message: "UserId Do Not Exits" })

        let { productId, cartId } = req.body
        if (!keyValid(req.body)) return res.status(400).send({ status: false, message: "Insert Data : BAD REQUEST" })

        if (!isValid(productId)) return res.status(400).send({ status: false, message: "Please Provide ProductId" })
        if (!isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Invalid ProductId" })
        let checkProduct = await productModel.findOne({ _id: productId, isDeleted: false })
        if (!checkProduct) return res.status(404).send({ status: false, message: "Product Do Not Exists or DELETED" })

        let checkCart = await cartModel.findOne({ userId })

        if (checkCart) {
            if (!isValid(cartId)) return res.status(400).send({ status: false, message: "Please Provide cartId" })
            if (!isValidObjectId(cartId)) return res.status(400).send({ status: false, message: "Invalid cartId" })
            if (checkCart._id != cartId) return res.status(403).send({ status: false, message: "you are not authorized for this cartId" })

            let arr2 = checkCart.items

            let productAdded = {
                productId: productId,
                quantity: 1
            }

            let compareProductId = arr2.findIndex((obj) => obj.productId == productId)

            if (compareProductId == -1) arr2.push(productAdded)
            else arr2[compareProductId].quantity += 1

            let totalPriceUpdated = checkCart.totalPrice + (checkProduct.price)

            let totalItemsUpdated = arr2.length

            let productAdd = {
                items: arr2,
                totalPrice: totalPriceUpdated,
                totalItems: totalItemsUpdated
            }
            let updatedData = await cartModel.findOneAndUpdate({ userId: userId }, productAdd, { new: true })
            return res.status(201).send({ status: true, message: "Success", data: updatedData })
        }
        let arr1 = []

        let products = {
            productId: productId,
            quantity: 1
        }
        arr1.push(products)

        let totalPriceCalculated = checkProduct.price * products.quantity

        let productAdd = {
            userId: userId,
            items: arr1,
            totalPrice: totalPriceCalculated,
            totalItems: 1
        }
        let createdData = await cartModel.create(productAdd)
        return res.status(201).send({ status: true, message: "Success", data: createdData })

    } catch (error) {
        return res.status(500).send({ status: false, message: error.message })
    }
}


const cartUpdate = async function (req, res) {
    try {

        let userId = req.params.userId

        let body = req.body

        const decodedToken = req.decodedToken

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: 'userId is not valid' })

        let user = await userModel.findById(userId)

        if (!user) return res.status(404).send({ status: false, messgage: ' user not found' })

        if (userId !== decodedToken) return res.status(403).send({ status: false, messgage: `Unauthorized access!, You can't update cart` })

        let { cartId, productId, removeProduct } = body

        if (!keyValid(body)) return res.status(400).send({ status: false, message: "Please provide data to Remove product or decrement the quantity" })

        if (!isValidObjectId(productId)) { return res.status(400).send({ status: false, msg: "Invalid productId" }) }

        let productDetails = await productModel.findOne({ _id: productId, isDeleted: false })

        if (!productDetails) return res.status(400).send({ status: false, message: "No product Exist with provided productId or might be deleted" })

        let productCart = await cartModel.findOne({ items: { $elemMatch: { productId: { $eq: productId } } } })

        if (!productCart) return res.status(400).send({ status: false, message: `No product Exist in cart with given productId ${productId}` })

        if (!isValidObjectId(cartId)) { return res.status(400).send({ status: false, msg: "Invalid cartId" }) }

        let cartDetails = await cartModel.findOne({ userId })

        if (!cartDetails) return res.status(400).send({ status: false, message: "No cart Exist with provided CartId" })

        if (cartDetails._id != cartId) return res.status(400).send({ status: false, message: "Unauthorized access!, You can't remove the other user cart" })

        if (!/^[0-1\|\(\)\&]$/.test(removeProduct)) return res.status(400).send({ status: false, message: "removeProduct should contains 1 for decrement of quantity by 1 || 0 for remove the product from cart" })

        let findProduct = cartDetails.items.find(x => x.productId.toString() == productId)

        if (removeProduct == 0) {
            let sumTotal = cartDetails.totalPrice - (productDetails.price * findProduct.quantity)

            await cartModel.findOneAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })

            let sumItems = cartDetails.totalItems - 1

            let deletedItem = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: sumTotal, totalItems: sumItems } }, { new: true })

            return res.status(200).send({ status: true, message: "Successfully removed the prodect", data: deletedItem })
        }

        let sumTotal1 = cartDetails.totalPrice - productDetails.price

        let itemsArray = cartDetails.items

        for (let i = 0; i < itemsArray.length; i++) {
            if (itemsArray[i].productId.toString() == productId) {
                itemsArray[i].quantity = itemsArray[i].quantity - 1

                if (itemsArray[i].quantity < 1) {
                    await cartModel.findByIdAndUpdate({ _id: cartId }, { $pull: { items: { productId: productId } } }, { new: true })

                    let sumItems = cartDetails.totalItems - 1

                    let data1 = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { totalPrice: sumTotal1, totalItems: sumItems } }, { new: true })

                    return res.status(200).send({ status: true, message: "No product exists for productId", data: data1 })
                }
            }
        }
        let res1 = await cartModel.findOneAndUpdate({ _id: cartId }, { $set: { items: itemsArray, totalPrice: sumTotal1 } }, { new: true })

        return res.status(200).send({ status: true, message: "product quantity is reduced by 1", data: res1 })

    } catch (error) {
        return res.status(500).send({ status: false, error: error.message })
    }
}


async function getCartDetails(req, res) {
    try {
        let userId = req.params.userId
        let decodedToken = req.decodedToken
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Invalid UserId" })

        if (userId !== decodedToken) return res.status(403).send({ status: false, messgage: "Unauthorized access!" })

        let checkUserId = await userModel.findById(userId)
        if (!checkUserId) return res.status(404).send({ status: false, message: "UserId Do Not Exits" })

        let checkCart = await cartModel.findOne({ userId }).populate({
            path: "items",
            populate: {
                path: 'productId',
                select: { 'title': 1, "price": 1, "productImage": 1 },
            }
        }).lean()
        if (!checkCart) return res.status(404).send({ status: false, message: "This user has no cart" })

        let itemsLength = checkCart.items.length

        if (itemsLength == 0) checkCart.items = "There are no products in Cart" 

        return res.status(200).send({ status: true, toatalItems: itemsLength, message: "Success", data: checkCart })

    } catch (error) {
        return res.status(500).send({ status: false, error: error.message })
    }
}


async function deleteCart(req, res) {
    try {
        let userId = req.params.userId
        let decodedToken = req.decodedToken
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: "Invalid UserId" })

        if (userId !== decodedToken) return res.status(403).send({ status: false, messgage: "Unauthorized access!, You can't create or add to other user cart" })

        let checkUserId = await userModel.findById(userId)
        if (!checkUserId) return res.status(404).send({ status: false, message: "UserId Do Not Exits" })

        let checkCart = await cartModel.findOne({ userId })
        if (!checkCart) return res.status(404).send({ status: false, message: "This user has no cart to delete" })

        let cart = {
            items: [],
            totalItems: 0,
            totalPrice: 0
        }

        await cartModel.findOneAndUpdate({ userId }, cart, { new: true })

        return res.status(204).send()

    } catch (error) {
        return res.status(500).send({ status: false, error: error.message })
    }
}


module.exports = { addToCart, cartUpdate, getCartDetails, deleteCart }
