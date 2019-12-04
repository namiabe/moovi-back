const express = require('express');

const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const User = require('../models/User');

router.get('/public-key', (req, res) => {
  res.status(200).json({ key: process.env.STRIPE_KEY });
});

router.post('/customer', async (req, res) => {
  const { user } = req;
  const { payment_method } = req.body;
  try {
    const customer = await stripe.customers.create({
      payment_method,
      email: user.email,
      invoice_settings: {
        default_payment_method: payment_method,
      },
    });
    console.log(customer);
    const { id } = customer;
    await User.findByIdAndUpdate(user.id, {
      paymentMethodId: payment_method,
      customerId: id,
    });
    res.status(200).json({ message: 'Customer has been created', customerId: id });
  } catch (err) {
    res.status(400).json({ message: 'Customer was not created', error: err.message });
  }
});

router.post('/subscription', async (req, res) => {
  const { id, customerId } = req.user;
  const { planId } = req.body;
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ plan: planId }],
      expand: ['latest_invoice.payment_intent'],
    });
    console.log(subscription);
    await User.findByIdAndUpdate(id, { isSubscribed: true, subscriptionId: subscription.id });

    res.status(200).json({ message: 'Subscription has been created', subscriptionId: subscription.id });
  } catch (err) {
    console.log(err);
    res.status(400).json({ message: 'Subscription was not created', error: err.message });
  }
});

module.exports = router;
