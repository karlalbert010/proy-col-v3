const demoService = require('./demo.service');

async function getTablasDemo(req, res, next) {
  try {
    const data = await demoService.getTablasDemo({ anio: req.query.anio });
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getTablasDemo
};
