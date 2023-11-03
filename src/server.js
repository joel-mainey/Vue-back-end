import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
const mongoose = require('mongoose');
import history from 'connect-history-api-fallback';
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

mongoose.connect(process.env.CONNECTION);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

const productSchema = new mongoose.Schema({
  id: String,
  name: String,
  description: String,
  price: String,
  image: String
});

const userSchema = new mongoose.Schema({
  id: String,
  cartItems: [String]
});

const Product = mongoose.model('Product', productSchema);
const User = mongoose.model('User', userSchema)


app.use('/assets', express.static(path.join(__dirname, '../assets')));

app.use(express.static(path.resolve(__dirname, '../dist'), { maxAge: '1y', etag: false }));
app.use(history());

app.get('/api/products', async (req, res) => {
  const products = await Product.find({});
  res.status(200).json(products);
});

app.get('/api/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  const user = await User.findOne({ id: userId });
  if (!user) return res.status(404).json('Could not find user!');
  const cartItemIds = user.cartItems;
  const products = await Product.find({ id: { $in: cartItemIds } });
  res.status(200).json(products);
});

app.get('/api/products/:productId', async (req, res) => {
  const { productId } = req.params;
  const product = await Product.findOne({ id: productId });
  if (product) {
    res.status(200).json(product);
  } else {
    res.status(404).json('Could not find the product!');
  }
});

app.post('/api/users/:userId/cart', async (req, res) => {
  const { userId } = req.params;
  const { productId } = req.body;
  await User.updateOne({ id: userId }, { $addToSet: { cartItems: productId }, });
  const user = await User.findOne({ id: userId });
  const cartItemIds = user.cartItems;
  const products = await Product.find({ id: { $in: cartItemIds } });
  res.status(200).json(products);
});

app.delete('/api/users/:userId/cart/:productId', async (req, res) => {
  const { userId, productId } = req.params;
  await User.updateOne({ id: userId }, { $pull: { cartItems: productId }, });
  const user = await User.findOne({ id: userId });
  const cartItemIds = user.cartItems;
  const products = await Product.find({ id: { $in: cartItemIds } });
  res.status(200).json(products);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(8000, () => {
  console.log('Server is listening on port 8000');
});