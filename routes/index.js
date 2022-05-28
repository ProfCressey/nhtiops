var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {

  var html = `
  <html>
    <body>
      <ul>
        <li><a href="fe/charts.html">CRN Charts</a></li>
        <li><a href="fe/DataTables.html">Data Tables</a></li>
      </ul>
    </body>
  </html>    
  `;

  res.send(html);
});

module.exports = router;
