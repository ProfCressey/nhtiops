const express = require('express');
const formidable = require('formidable');
const csv = require('csv-parser');
const fs = require('fs');
const dal = require("../dal/sqlEngine");

// I concede this is not robust...
// const uploadPassword = "qwertyuiop";
const uploadPassword = "";

const router = express.Router();

/* GET api test page */
router.get('/', function(req, res, next) {
  res.send("<p>Hello</p>");
});

// Receive CSV upload
router.get('/upload', function(req, res, next) {
  let html = `
    <h1>CSV Upload Page</h1>

    <form action="upload" method="post" enctype="multipart/form-data">
    
    <label for="csvfile">Select a BANNER CSV export file: <br>
      <input type="file" name="csvfile">
    </label>
    
    <br><br>
    
    <label for="csvdate">Enter the date for these actuals: <br>
      <input type="date" name="csvdate">
    </label>
    
    <br><br>
    
    <label for="csvpassword">Password: <br>
      <input type="password" name="csvpassword">
    <label>

    <br><br>

    <input type="submit">
    </form>
  `
  res.send(html);
});

// Parse CSV upload
router.post('/upload', function(req, res, next) {

  coursesCacheReload = true;
  var form = new formidable.IncomingForm();
  var csvData = [];

  form.parse(req, async function (err, fields, files) {
    // security, sortof
    if(fields.csvpassword != uploadPassword){
      res.send("Bad password. Bad. Bad!");
    }
    // check for csv file
    else if(files.csvfile.path) {
      
      // fix stupid input format
      try {
        var rawString = fs.readFileSync(files.csvfile.path, 'utf8');

        var rawStrings = rawString.split('\n');
        var goodStrings = [];
        var goodData = [];

        for(i = 0; i < rawStrings.length; i++){
          if(rawStrings[i].length > 111 
            && rawStrings[i].substring(0,4) != "CRSE"
            && rawStrings[i].substring(0,4) != "SXRT"
            && rawStrings[i].substring(0,4) != "DATE") {
              goodStrings.push(rawStrings[i]);
          }
        }

        let o = 0;

        for(i = 0; i < goodStrings.length; i++){
          // offset because stupid
          if(goodStrings[i].substring(3,4) == " "){ o = -1; }

          goodData[i] = {
            'CRN': goodStrings[i].substring(15,20).trim(),
            'SUBJ': goodStrings[i].substring(0,4 + o).trim(),
            'CRSE': goodStrings[i].substring(5 + o,9).trim(),
            'SEC': goodStrings[i].substring(11,14).trim(),
            'TITLE': goodStrings[i].substring(21,53).trim(),
            'AC': goodStrings[i].substring(108,110).trim(),
            'MX': goodStrings[i].substring(105,107).trim()
          }
        }

        var output = "";
        var courseJson = parseCourses(goodData);
        var uploadDate = fields.csvdate;
        
        if(courseJson != {}) {
          var results = await dal.loadCourses(courseJson);
          output = output + "<p>Courses added: " + results.totalRowsAffected + "</p>";
        } else {
          output = output + "<p>No file data, no courses added</p>";
        }
        
        if(uploadDate){
          var results = await dal.loadCourseActuals(courseJson, uploadDate);
          output = output + "<p>Course Actuals: " + results.totalRowsAffected + "</p>";
        }
        else {
          output = output + "<p>No date specified, no actuals updated</p>";
        }        

        res.send(output);

      } catch(e) {
          res.send("<p>Something is wrong with the form! Ahhh!</p>");
          console.log('Error:', e.stack);
      }

/*       fs.createReadStream(files.csvfile.path)
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', async () => {
          var output = "";
          var courseJson = parseCourses(csvData);
          var uploadDate = fields.csvdate;
          
          if(courseJson != {}) {
            var results = await dal.loadCourses(courseJson);
            output = output + "<p>Courses added: " + results.totalRowsAffected + "</p>";
          } else {
            output = output + "<p>No file data, no courses added</p>";
          }
          
          if(uploadDate){
            var results = await dal.loadCourseActuals(courseJson, uploadDate);
            output = output + "<p>Course Actuals: " + results.totalRowsAffected + "</p>";
          }
          else {
            output = output + "<p>No date specified, no actuals updated</p>";
          }        

          res.send(output);
      }); */
    } else {
      res.send("<p>Something is wrong with the form! Ahhh!</p>");
    }
  });
});

router.get('/classes', function(req, res, next) {
  dal.getAllClasses().then(result => {
    res.send(result);
  });
});

// listing courses as json for the front-end
router.get('/courses', function(req, res, next) {
  dal.getAllCourses().then(result => {
    res.send(result);
  });
});

// get a single course  
router.get('/courses/:crn', function(req, res, next) {

  dal.getCourse(req.params.crn).then(result => {
    res.send(result);
  });

});

// get actuals for a course by crn
router.get('/courses/actuals/:crn', function(req, res, next) {

  dal.getCourseActuals(req.params.crn).then(result => {
    res.send(result);
  })

});

// get json of courses from the raw csv json
function parseCourses(raw) {
  var courses = {};
  for(let i = 0; i < raw.length; i++){
    // only unique courses added
    if(!courses[raw[i]["CRN"]]){
      courses[raw[i]["CRN"]] = {
        'crn': raw[i]["CRN"],
        //'campus': raw[i]["CP"],
        'subject': raw[i]["SUBJ"],
        'number': raw[i]["CRSE"],
        'section': raw[i]["SEC"],
        'title': raw[i]["TITLE"],
        'actual': raw[i]["AC"],
        'max': raw[i]["MX"],
        //'begin': raw[i]["BEGINDATE"],
        //'end': raw[i]["ENDDATE"],
      }
    }
  }
  return courses;
}

// break up strings, because whatever
function chunkString(str, length) {
  return str.match(new RegExp('.{1,' + length + '}', 'g'));
}

module.exports = router;
