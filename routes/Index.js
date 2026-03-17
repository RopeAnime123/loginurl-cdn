const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

module.exports = (app) => {
    app.use(express.urlencoded({ extended: false }));
    app.use(express.json());
    app.use(cookieParser()); // tambahan
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header(
            'Access-Control-Allow-Headers',
            'Origin, X-Requested-With, Content-Type, Accept'
        );
        next();
    });
    app.use(express.static(path.join(__dirname, '..', 'public')));
};
