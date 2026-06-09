/**
 * Author: Wesnydy Lima Ribeiro
 * Email: wesnydy@lavid.ufpb.br
 */

var express = require('express')
  , router = express.Router()
  , videoController = require('../controllers/video');

/**
 * Route to process gloss and create video.
 */
router
  .post('/', videoController.create)
  .get('/status/:id', videoController.status)

module.exports = router;
