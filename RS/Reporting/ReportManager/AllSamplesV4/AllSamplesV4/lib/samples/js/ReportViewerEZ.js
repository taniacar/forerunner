﻿var allSamples = allSamples || {};

$(function () {
    allSamples.reportViewerEZ = {
        init: function (target) {
            if (allSamples.sampleExists(target)) {
                // Only create the sample once
                return;
            }
            var $sampleArea = allSamples.getSampleArea(target);

            // Create the reportViewerEZ widget and hold onto a reference
            var $reportViewerEZ = $sampleArea.reportViewerEZ({
                isReportManager: false,
                isFullScreen: false
            });

            // Get the reportViewer widget from reportViewerEZ and load the report
            var $reportViewer = $reportViewerEZ.reportViewerEZ("getReportViewer");
            $reportViewer.reportViewer("loadReport", allSamples.settings.reportPath1);
        }  // init
    }  // allSamples.reportViewerEZ
});  // function()
