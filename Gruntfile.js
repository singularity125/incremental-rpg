module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-wiredep');

      grunt.initConfig({
        wiredep: {
          target: {
            src: 'app/index.html' // point to your HTML file.
          }
        }
      });
};