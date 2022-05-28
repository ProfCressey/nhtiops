google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(drawChart);
var allOptions = [];

function drawChart(courseArray) {
    // var data = google.visualization.arrayToDataTable(courseArray);

    var data = new google.visualization.DataTable();
    data.addColumn('date', 'Date');
    data.addColumn('number', 'Actual');

    data.addRows(courseArray);
    
    var options = {
        title: 'Course Actuals',
        curveType: 'linear',
        legend: { position: 'bottom' }
    };

    var chart = new google.visualization.LineChart(document.getElementById('google_chart'));

    chart.draw(data, options);
}

async function getClassList() {
    status("Running getClassList");
    return $.ajax({
        url: '/api/classes/',
        dataType: "json",
    })
        .done(function(data) {
        status("getClassList data recieved, updating course list...");
        console.log("getClassList data recieved");
        updateClassList(data);
    })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log("* getClassList failed");
        status(errorThrown);
    });  
}

// get and update the course list
async function getCourseList() {
    status("Running getCourseList");
    return $.ajax({
        url: '/api/courses/',
        dataType: "json",
    })
        .done(function(data) {
        status("getCourseList data recieved, updating course list...");
        console.log("getCourseList data recieved");
        updateCourseList(data);
    })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log("* getCourseList failed");
        status(errorThrown);
    });  
}

function updateClassList(classes) {
    let coursesDropdown = $("#courseDropdown");
    for(cl in classes){
        let c = classes[cl];
        let option = "<option value=" + c.program + "-" + c.courseNum + ">" 
            + c.program + "-"
            + c.courseNum + " "
            + c.title + "</option>";
        coursesDropdown.append(option);
        allOptions.push(option);
    }
}

function updateCourseList(courses) {
    let coursesDropdown = $("#courseDropdown");
    for(course in courses){
        let c = courses[course];
        let option = "<option value=" + c.crn + ">" 
            + c.crn + " "
            // + c.campus + " "
            + c.subject + " "
            + c.number + " "
            + c.section + " "
            + c.title + " "
            + c.max + "</option>";
        coursesDropdown.append(option);
        allOptions.push(option);
    }
}

// update chart with a specific course's data
async function getCourseActuals(crn) {
    let url = '/api/courses/actuals/' + String(crn);
    console.log("Attempting to get course actuals for: " + url);
    try {
      const response = await fetch(url);
      if (!response.ok)
        throw Error("${response.statusText}");
      
      const data = await response.json();
      drawActualsChart(data);
    }
    catch(err) {
      console.log(err);
    }
}

function drawActualsChart(data) {
    dataArray = [];
    dates = [];
    actuals = [];
    let prevActual = -1;
    let d = null;
    for(let act in data){
      d = data[act];
      let actual = parseInt(d.actual);
      if (actual != prevActual) {
        dates.push(d.listingDate);
        actuals.push(actual);
        prevActual = actual
      }
      //console.log(d);
    }
    if (actuals.length == 1) {
      actuals.push(parseInt(d.actual));
      dates.push(d.listingDate);
    }
    dataArray.push(dates, actuals);
    createActualsChart(dataArray);
  }

  function createActualsChart(data) {
    Highcharts.setOptions({
      lang: {
        thousandsSep: ","
      }
    });
   
    Highcharts.chart("chart", {
      title: {
        text: "Actuals by Date"
      },
      subtitle: {
        text: "Data from NHTI"
      },
      xAxis: [
        {
          categories: data[0],
          labels: {
            rotation: -45
          }
        }
      ],
      yAxis: [
        {
          // first yaxis
          title: {
            text: "Actual"
          }
        }
      ],
      series: [
        {
          name: "Actual", //"Population (2017)",
          color: "#0071A7",
          type: "spline",
          data: data[1],
          tooltip: {
            valueSuffix: " M"
          }
        }
      ],
      tooltip: {
        shared: true
      },
      legend: {
        backgroundColor: "#ececec",
        shadow: true
      },
      credits: {
        enabled: false
      },
      noData: {
        style: {
          fontSize: "16px"
        }
      }
    });
  }
  
/*
async function getCourseActuals(crn){
    let url = '/api/courses/actuals/' + String(crn);
    status("Attempting to get course actuals for: " + url);

    return $.ajax({
        url: url,
        dataType: "json",
    })
    .done(function(data) {
        status("getCourseActuals recieved: " + Object.keys(data).length + " actuals for " + crn);
        drawChart(toChartArray(data));
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        status(errorThrown);
    });  
}
*/

function toChartArray(json) {
    // let arr = [ ["Date", "Actual"] ];
    let arr = [];

    for(row in json){
        for(item in row) {
        arr.push([ new Date(json[row].date), json[row].actual] );
        }
    }
    console.log(JSON.stringify(arr));
    return arr;
}

function status(update) {
    $("#status").append("<p>" + update + "</p>");
}

function initialize() {
    $(".loading").remove();
    
    $("#courseDropdown").on('change blur', function() {
        let crn = $("#courseDropdown").val();
        status("Attempting to get course actuals for crn: " + crn );
        getCourseActuals(crn);
    });

    $("#courseDropdown").filterByText($("#courseFilter"));

    $("form").on("submit", function(event) {
        event.preventDefault();
    });

    status("Initialization complete");
}

//jQuery extension method:
jQuery.fn.filterByText = function(textbox, minLen) {
    if(!minLen) {
        minLen = 1;
    }
    return this.each(function() {
        var select = this;
        var options = [];
        $(select).find('option').each(function() {
            options.push({
            value: $(this).val(),
            text: $(this).text()
            });
        });
        $(select).data('options', options);
    
        $(textbox).on('change keyup', function() {
            var search = $.trim($(this).val());

            if(search.length >= minLen) {
                var options = $(select).empty().scrollTop(0).data('options');
                var regex = new RegExp(search, "gi");
        
                $.each(options, function(i) {
                    var option = options[i];
                    if (option.text.match(regex) !== null) {
                        $(select).append(
                            $('<option>').text(option.text).val(option.value)
                        );
                    }
                });
            }
        });
    });
  };

$(function() {
    getCourseList().then(result => {
    //getClassList().then(result => {
        initialize();
    }).catch(err => {
        status(err);
    }); 
});

