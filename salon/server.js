const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;
const beauticianRoutes = require('./src/routes/beauticians');

mongoose.connect('mongodb://localhost:27017/NodeDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(express.json());
app.use('/api', beauticianRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
