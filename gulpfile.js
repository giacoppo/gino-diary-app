var gulp        = require('gulp');
var browserSync = require('browser-sync').create();
var sass        = require('gulp-sass');
var nodemon     = require('gulp-nodemon');

// Static Server + watching scss/html files
gulp.task('serve', ['sass'], function() {

    // browserSync.init({
    //     server: "./"
    // });

    gulp.watch("scss/*.scss", ['sass']);
    gulp.watch("*.js").on('change', browserSync.reload);
    // gulp.watch("*.json").on('change', browserSync.reload);
});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', function() {
    return gulp.src("scss/*.scss")
        .pipe(sass())
        .pipe(gulp.dest("public/stylesheets"))
        .pipe(browserSync.stream());
});

gulp.task('browser-sync', ['nodemon'], function() {
	browserSync.init(null, {
		proxy: "http://localhost:3000",
        files: [
            "public/**/*.*",
            "views/**/*.ejs",
            "views/*.ejs"
        ],
        port: 7000,
	});
});

gulp.task('nodemon', function (cb) {
	
	var started = false;
	
	return nodemon({
		script: 'app.js'
	}).on('start', function () {
		// to avoid nodemon being started multiple times
		// thanks @matthisk
		if (!started) {
			cb();
			started = true; 
		} 
	});
});

gulp.task('default', ['serve','browser-sync'], function() {

});