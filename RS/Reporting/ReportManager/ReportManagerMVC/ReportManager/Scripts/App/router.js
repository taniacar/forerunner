// Assign or create the globally scoped variables
var g_App = g_App || {};
var forerunner = forerunner || {};

// Forerunner SQL Server Reports
forerunner.ssr = forerunner.ssr || {};

// Everything inside this function is local unless assigned to a global variable such
// as g_App
var ApplicationRouter = Backbone.Router.extend({
        routes : {
            "": "transitionToReportManager",
            "explore/:path" : "transitionToReportManager",      
            "browse/:path": "transitionToReportViewer",
            "favorites": "transitionToFavorites",
            "recent": "transitionToRecent",
            "test/:arg": "test",
            '*notFound': 'notFound'
        },

        // Application page view
        appPageView : null,

        notFound: function () {
            alert('Not found');
        },

        transitionToReportManager: function (path) {
            this._transitionToReportManager(path, null);
        },

        transitionToFavorites: function () {
            this._transitionToReportManager(null, 'favorites');
        },
        transitionToRecent: function () {
            this._transitionToReportManager(null, 'recent');
        },
        
        _selectedItemPath : null,

        _transitionToReportManager: function (path, view) {
            var path0 = path;
            this.appPageView.hideSlideoutPane(true);
            this.appPageView.hideSlideoutPane(false);
            g_App.utils.allowZoom(false);
            $('#footerspacer').attr('style', 'height:0');
            $('#bottomdiv').attr('style', 'height:0');
            if (g_App.utils.isTouchDevice()) {
                $('#headerspacer').attr('style', 'height:35px');
            }            
      
            $('#mainViewPort').css({ width: "100%" });

            if (path == null) {
                path = "/";
            }

            var catalogItemUrl = forerunner.ssr.CatalogItemsModel.getCatalogItemUrl(view, path);
            var me = this;
            var currentSelectedPath = me._selectedItemPath;

            forerunner.ssr.CatalogItemsView.fetchModelAndRenderView({
                catalogItemUrl: g_App.configs.apiBase + catalogItemUrl,
                $toolbar: $('#mainSectionHeader'),
                $explorerview: $("#mainSection"),
                reportManagerAPIUrl: g_App.configs.apiBase + 'ReportManager/',
                path: path,
                selectedItemPath: currentSelectedPath,
                navigateTo: me.navigateTo
            });

            $('#rightheader').height($('#topdiv').height());
            $('#leftheader').height($('#topdiv').height());
            $('#rightheaderspacer').height($('#topdiv').height());
            $('#leftheaderspacer').height($('#topdiv').height());

            me._selectedItemPath = path0;
        },

        navigateTo: function (action, path) {
            if (path != null) path = String(path).replace(/%2f/g, "/");
            if (action == 'home') {
                g_App.router.navigate('#', { trigger: true, replace: false });
            } else if (action == 'back') {
                g_App.router.back();
            } else if (action == 'favorites') {
                g_App.router.navigate('#favorites', { trigger: true, replace: false });
            } else if (action == 'recent') {
                g_App.router.navigate('#recent', { trigger: true, replace: false });
            } else {
                var encodedPath = String(path).replace(/\//g, "%2f");
                var targetUrl = '#' + action + '/' + encodedPath;
                g_App.router.navigate(targetUrl, { trigger: true, replace: false });
            }
        },

        transitionToReportViewer: function (path) {
            var me = this;
            me._selectedItemPath = null;

            g_App.utils.allowZoom(true);
            $('#footerspacer').attr('style', 'height: 150px');
            $('#bottomdiv').attr('style', 'height: 150px;display: none;');
            $('#headerspacer').attr('style', 'height: 50px');
            if (path != null) {
                path = String(path).replace(/%2f/g, "/");
            } else {
                path = "/";
            }

            $('#mainSection').html(null);
            $viewerContainer = new $('<DIV id="FRReportViewer1"/>');
            $('#mainSection').append($viewerContainer);

            $viewer = $('#FRReportViewer1');
            var initializer = new forerunner.ssr.ReportViewerInitializer({
                $toolbar: $('#mainSectionHeader'),
                $toolPane: $('#leftPaneContent'),
                $viewer: $viewer,
                $nav: $('#bottomdiv'),
                $paramarea: $('#rightPaneContent'),
                $lefttoolbar: $('#leftheader'),
                $righttoolbar: $('#rightheader'),
                ReportServerURL: g_App.configs.reportServerUrl,
                ReportViewerAPI: g_App.configs.reportControllerBase,
                ReportPath: path,
                toolbarHeight: me.toolbarHeight,
                navigateTo: me.navigateTo
            });

            initializer.render();

            $viewer.on('reportviewerback', function (e, data) {
                me._selectedItemPath = data.path;
                me.historyBack();
            });

            //$('#rightheader').height( $('#topdiv').height());
            //$('#leftheader').height($('#topdiv').height());
            $('#rightheaderspacer').height($('#topdiv').height());
            $('#leftheaderspacer').height($('#topdiv').height());
            me.appPageView.bindEvents();
        },
       
        toolbarHeight : function() {
            return $("#topdiv").outerHeight();
        },

        historyBack: function () {
            g_App.router.back();
        },
    
        initialize : function() {
            // Create the application page framework; specifically the header, main section and footer.
            // Then attach it to the page. The application page sections will be shared by all pages.
            this.appPageView = new g_App.AppPageView().render();
        }
    });

// This call essential starts the application. It will Load the initial Application Page View
// and then start the Backbone Router processing (I.e., g_App.router)
$(document).ready(function () {
    // Create the application Router 
    g_App.router = new ApplicationRouter();
    Backbone.history.length = 0;
    Backbone.history.on('route', function () { ++this.length; });
    g_App.router.back = function () {
        Backbone.history.length -= 2;
        window.history.back();
    };
    Backbone.history.start();
});

