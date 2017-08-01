var express = require('express');
var app = express();
var request = require('request');
app.set('view engine', 'ejs');
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));


var traffic,
    weather,
    forecast,
    todos = [];
app.get('/', function(req, res){
   request('http://dev.virtualearth.net/REST/v1/Traffic/Incidents/39.784027,-75.035986,40.027883,-74.829473?key=ArLa6JxoMs4uT_XJfS6sgsFm7mXq8HXwvmDblyyBce9V8JMma-csh_6Dj6cnzKRn', function(err, response, body){
       if(!err){
           traffic = JSON.parse(body)['resourceSets'][0]['resources'];
           request('http://api.openweathermap.org/data/2.5/weather?zip=08053,us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body) {
             if(!err){
                weather = JSON.parse(body);
                request('http://api.openweathermap.org/data/2.5/forecast?zip=08053,us&units=imperial&APPID=2cf2807ad1a80221adce09c988f81580', function(err, response, body) {
                   if(!err){
                       forecast = JSON.parse(body)['list'];
                       res.render('home', {todos: todos, incidents: traffic, weather: weather, forecast: forecast});
                   } 
                });
                
             }  
           });
       }
   }) ;
});

app.listen(process.env.PORT, process.env.IP, function(){
    console.log('success');
});