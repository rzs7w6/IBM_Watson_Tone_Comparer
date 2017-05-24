var mysql = require("mysql");
var ToneAnalyzerV3 = require('watson-developer-cloud/tone-analyzer/v3');
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var fs = require('fs');
var math = require('mathjs');
// Create application/x-www-form-urlencoded parser
var urlencodedParser = bodyParser.urlencoded({ extended: false })

var tone_analyzer = new ToneAnalyzerV3({
  username: 'IBM_WATSON_USERNAME',
  password: 'IBM_WATSON_PASSWORD',
  version_date: '2016-05-19'
});

app.use(express.static('public'));
app.get('/index.html', function (req, res) {
   res.sendFile( __dirname + "/" + "index.html" );
})

app.post('/process_db', function(req, res) {
	var con = mysql.createConnection({
		host : "localhost",
		user : "MYSQL_USER",
		password : "MYSQL_PASSWORD",
		database : "MYSQL_DATABASE"
	});
	con.connect(function(err){
	if(err) {
		console.log('Error connecting to Db:' + err.stack);
			return;
		}
		console.log('Connection established.');
	});   

	var queryString = 'select * from responses';
	//Check string
	console.log(queryString);
	con.query(queryString, function (error, results, fields) {
		console.log(results[0]);
		var toPrint = "";
        var avgAgreeableness = 0;
		var css = "<style> #wrapper {font-size : 1em;} body {background-color : aliceblue;}</style>";
		for(i = 0; i < results.length; i++) {
			toPrint += "<p>" + results[i].response + " <br/> Difference: " + math.round(results[i].agreeableness, 2) + "</p>";
            avgAgreeableness += math.abs(results[i].agreeableness);
		}
        avgAgreeableness = avgAgreeableness/results.length;
        avgAgreeableness = math.round(avgAgreeableness, 2);
        avgAgreeableness = "Averagage Difference: " + avgAgreeableness + "<br/><span>The closer the difference is to 0 the closer Watson is to calculating emotions like us.</span><hr/><div id=\"results\">";
		fs.readFile('example.html', function read(err, content1) {
			if (err) {
				throw err;
			}

			fs.readFile('example2.html', function read(err, content2) {
				if (err) {
					throw err;
				}
				res.end(css + content1 + avgAgreeableness + toPrint + "</div>" + content2);
			});
		});
	});

})

app.post('/process_post', urlencodedParser, function (req, res) {
	var con = mysql.createConnection({
		host : "localhost",
		user : "MYSQL_USER",
		password : "MYSQL_PASSWORD",
		database : "MYSQL_DATABASE"
	});
	con.connect(function(err){
	if(err) {
		console.log('Error connecting to Db:' + err.stack);
			return;
		}
		console.log('Connection established.');
	});
   // Prepare output in JSON format
   content = {
      conversation:req.body.conversation
   };
   console.log(content);
   userEmotion = {
      userEmotion:req.body.userEmotion
   };
   console.log(userEmotion);
   userEmotionRange = {
      userEmotionRange:req.body.userEmotionRange
   };
   console.log(userEmotionRange);
   tone_analyzer.tone({ text: req.body.conversation },
     function(err, tone) {
		if (err)
		  console.log(res.end(JSON.stringify(content)) + err);
		else {
			var content1;
			var content2;
			fs.readFile('example.html', function read(err, content1) {
				if (err) {
					throw err;
				}

				fs.readFile('example2.html', function read(err, content2) {
					if (err) {
						throw err;
					}
					if (userEmotion.userEmotion == "anger") {
						level = tone.document_tone.tone_categories[0].tones[0].score;
					}
					else if (userEmotion.userEmotion == "disgust") {
						level = tone.document_tone.tone_categories[0].tones[1].score;
					}
					else if (userEmotion.userEmotion == "fear") {
						level = tone.document_tone.tone_categories[0].tones[2].score;
					}
					else if (userEmotion.userEmotion == "joy") {
						level = tone.document_tone.tone_categories[0].tones[3].score;
					}
					else if (userEmotion.userEmotion == "sadness") {
						level = tone.document_tone.tone_categories[0].tones[4].score;
					}
					console.log(level);
					if (level == 0) {
						var sendString = "<br/>Watson didn't understand your statement, try using complete sentences without slang.<br/>";
					}
					else {
						console.log(userEmotionRange);
						agreeableness = math.abs((level - (userEmotionRange.userEmotionRange / 100)).toString());
						queryString = 'insert into responses (response, userEmotion, userValue, watsonValue, agreeableness) values ("' + (content.conversation) + '", "' + (userEmotion.userEmotion) + '", ' + (userEmotionRange.userEmotionRange) + ', ' + level + ', ' + agreeableness + ')';
						//Check string
						console.log(queryString);
						con.query(queryString, function(err, rows){
							if(err) 
								throw err;
							else
								console.log(rows);
						});
						var userRoundedLevel = math.round((userEmotionRange.userEmotionRange / 100), 2);
						level = math.round(level, 2);
						agreeableness = math.round(agreeableness, 2);
						var sendString = "You're Level: " + userRoundedLevel + "<br/>Watson's Level: " + level + "<br/>Difference: " + agreeableness;
					}
					res.end("<style>body {background-color : aliceblue;}</style>" + content1 + sendString + content2);
				});
			});
		}
	});
})



var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port
   
   console.log("Example app listening at http://%s:%s", host, port)
   
})