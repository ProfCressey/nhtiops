const sql = require("mssql/msnodesqlv8");

// cache data to improve performance
// this can be simplified and improved substantially
var useCoursesCache = false;
var useCourseActualsCache = false;
var coursesCache = {};
var courseActualsCache = {};

// sql server configuration
const config = {
/*  user: 'nhtiopsdb-admin',
  password: 'nhti1234qwer!@#$QWER',
  server: 'nhtiopsdb.database.windows.net',
  database: 'opsdb',
  options: { encrypt: true }*/
  database: 'opsdb',
  server: 'localhost',
  driver: "msnodesqlv8",
  options: { trustedConnection: true 
  }
}

// query data structures
// used to protect against invalid requests
const data = {
    tables: {
        courses: {
            crn: "crn",
            // campus: "campus",
            subject: "subject",
            number: "number",
            section: "section",
            title: "title",
            max: "max",
        },
        courseActuals: {
            crn: "crn",
            actual: "actual",
            date: "date",
        },
    },

    sql: {
        crn: sql.Int,
        // campus: sql.VarChar(50),
        subject: sql.VarChar(50),
        number: sql.VarChar(50),
        section: sql.VarChar(50),
        title: sql.VarChar(100),
        date: sql.Date,
        actual: sql.Int,
        max: sql.Int,
    },
}

// return an array of crns as numbers
async function getCrnsArray(){

    var query = 'select crn from courses order by crn asc';

    return runQuery(query).then(result => {
        var courseCrns = [];
        for(record in result.recordset){
            courseCrns.push(result.recordset[record].crn);
        }
        return courseCrns;
    }).catch(err => {
        console.log(err);
    });
}

// load courses from json to db
// builds query strings and manages server load
async function loadCourses(courses){
    var currentCrns = await getCrnsArray();

    var elements = {};

    // build object of only new courses
    for(course in courses){
        if(!currentCrns.includes(parseInt(course))) {
            elements[course] = JSON.parse(JSON.stringify(courses[course]));
        }
    }

    if(Object.keys(elements).length == 0) {
        return { totalRowsAffected: 0 };
    }

    const table = 'courses';

/*     const queryConfig = {
        crn: 'crn',
        campus: 'campus', 
        subject: 'subject', 
        number: 'number',
        section: 'section',
        title: 'title',
    }

    const query = 'INSERT INTO Courses ("crn", "campus", "subject", "number", "section", "title") VALUES '
        + '( @crn , @campus, @subject, @number, @section, @title )'; */

/*     return await runPreparedQuery(query, queryConfig, elements).then(results => {
        useCoursesCache = false;
        return results;
    }); */

    return await runBulkInsert(table, elements).then(results => {
        useCoursesCache = false;
        return results;
    });
}

async function loadCourseActuals(courses, date){

    if(!date){
        let error = "No date provided for course actuals, exiting";
        console.log(error);
        return error;
    }

    // get all course actuals for a given date to compare
    currentCourseActuals = await getCourseActualsByDate(date);

    // identify crns for previously loaded courses on this date
    currentCourses = [];
    for(row in currentCourseActuals){
        currentCourses.push(parseInt(currentCourseActuals[row].crn));
    }

    // build object of only new course actuals
    var elements = {};
    for(course in courses){
        if(!currentCourses.includes(parseInt(course))) {
            elements[course] = JSON.parse(JSON.stringify(courses[course]));
            elements[course].date = date;
        }
    }

    // if there is nothing new, return immediately
    if(Object.keys(elements).length == 0) {
        return { totalRowsAffected: 0 };
    }

    const table = 'courseActuals';

/*     const queryConfig = {
        crn: 'crn',
        date: 'date', 
        actual: 'actual', 
    }

    const query = 'INSERT INTO CourseActuals ("crn", "date", "actual") VALUES '
        + '( @crn , @date, @actual )'; */

/*     return await runPreparedQuery(query, queryConfig, elements).then(results => {
        useCourseActualsCache = false;
        return results;
    }); */

    return await runBulkInsert(table, elements).then(results => {
        useCoursesCache = false;
        return results;
    });
}

async function getCourse(crn) {
    // single element example
    const elements = { elem: { crn: crn, } };

    const queryConfig = {
        crn: 'crn',
    }
    const query = 'SELECT * FROM courses where crn = @crn';

    return await runPreparedQuery(query, queryConfig, elements).then(results => {
        return results.recordset;
    });
}

async function getCourseActuals(crn) {

    const elements = { elem: { crn: crn, } };

    const queryConfig = {
        crn: 'crn',
    }
    //const query = 'SELECT * FROM courseActuals where crn = @crn';
    const query = 'SELECT crn, term, convert(varchar(10), listingDate, 110) as listingDate, actual FROM crnActuals where crn = @crn';

    return await runPreparedQuery(query, queryConfig, elements).then(results => {
        return results.recordset;
    });
}

async function getCourseActualsByDate(date) {
    const elements = { elem: { date: date, } };

    const queryConfig = {
        date: 'date',
    }
    const query = 'SELECT * FROM courseActuals where date = @date';

    return await runPreparedQuery(query, queryConfig, elements).then(results => {
        return results.recordset;
    });
}
async function getAllClasses() {
    const query = 'select term, crn, cl.program, cl.courseNum, title, actual, bldg, room from classes cl\
    join courses c on cl.program = c.program and cl.courseNum = c.courseNum';
    /*  'select cl.program, cl.courseNum, crn, title, convert(varchar(10), startDate, 110) as startDate, actual from classes cl join courses2 c on cl.program = c.program and\
      cl.courseNum = c.courseNum';*/

    return runQuery(query).then(result => {
        //console.log('GetAllClasses: ' + result.recordset[0].courseNum);
        return result.recordset;
    }).catch(err => {
        console.log(err);
        return {};
    });
}

async function getAllCourses(){

    if(useCoursesCache) {
        return coursesCache;
    }

    const query = 'select * from courses order by crn asc';

    return runQuery(query).then(result => {
        coursesCache = result.recordset;
        useCoursesCache = true;
        return result.recordset;
    }).catch(err => {
        console.log(err);
        return {};
    });
}

async function getAllCourseActuals(){

    if(useCourseActualsCache){
        return courseActualsCache;
    }

    const query = 'select * from courseActuals order by crn asc';

    return runQuery(query).then(result => {
        courseActualsCache = result.recordset;
        useCourseActualsCache = true;
        return result.recordset;
    }).catch(err => {
        console.log(err);
        return {};
    });
}

// does a bulk add to a table
async function runBulkInsert(table, rows) {

    var lastResult = {};

    console.log("runBulkInsert running...");
    console.log("table: " + JSON.stringify(table));
    
    try {
        const sqlTable = new sql.Table(table);

        for(col in data.tables[table]){
            colName = data.tables[table][col];
            console.log(data.tables[table][col] + ", " + data.sql[colName]);
            sqlTable.columns.add(data.tables[table][col], data.sql[colName], {nullable: false});
        }

        let i = 0;
        let j = 0;
        for(row in rows) {
            let curRow = rows[row];

            if(i++ < 5){ console.log(JSON.stringify(curRow)); }

            let record = [];

            for(field in data.tables[table]) {
                if(data.sql[field] == sql.Date) {
                    record.push(new Date(curRow[field]));
                }
                else {
                    record.push(curRow[field]);
                }
            }

            if(j++ < 5){ console.log(JSON.stringify(record)); }

            sqlTable.rows.add(...record);
        }

        const pool = await new sql.ConnectionPool(config).connect();
        const request = new sql.Request(pool);
        lastResult.totalRowsAffected = await request.bulk(sqlTable).then((result) => {
            return result.rowsAffected;
        });
        sql.close();

    } catch (err) {
        console.log(err);
        lastResult.error = "bulk import failed";
        lastResult.totalRowsAffected = 0;
    }

    return lastResult;
}

// runs a prepared statement and returns the rows affected
async function runPreparedQuery(query, queryConfig, elements) {
    let lastResult = {};

    try {
        let rowCount = 0;
        const pool = await new sql.ConnectionPool(config).connect();
        const ps = new sql.PreparedStatement(pool);
    
        for(param in queryConfig) {
            ps.input(queryConfig[param], data.sql[param]); 
        }
    
        await ps.prepare(query).then(result => {
            console.log("Prepared statement complete...");
        }).catch(err => {
            console.log(err);
        });
    
        for(element in elements){
            var queryParams = {}
            for(param in queryConfig) {
                queryParams[param] = elements[element][param];
            }
    
            await ps.execute(queryParams).then(result => {
                rowCount = rowCount + parseInt(result.rowsAffected);
                lastResult = result;
            });
        }
    
        ps.unprepare(err => {
            console.log(err);
        });
    
        lastResult.totalRowsAffected = rowCount;
    }
    catch (err) {
        console.log(err);
        lastResult.error = "Something went wrong in runPreparedQuery";
    }
    return lastResult;
}

// used ONLY for query literals with no injectable values
async function runQuery(query) {
    return new sql.ConnectionPool(config).connect().then(pool => {
        return pool.request().query(query)
    }).then(result => {
        sql.close();
        return result;
    }).catch(err => {
        console.log(err);
        sql.close();
        return { error: "Something went wrong in runQuery" };
    });
}

module.exports = {
    runQuery: runQuery,
    data: data,
    loadCourses: loadCourses,
    loadCourseActuals : loadCourseActuals,
    getAllCourses : getAllCourses,
    getAllCourseActuals: getAllCourseActuals,
    getCourse : getCourse,
    getCourseActuals : getCourseActuals,
    getAllClasses : getAllClasses,
}