﻿/**
 * @file Contains the reportProperties widget.
 *
 */

// Assign or create the single globally scoped variable
var forerunner = forerunner || {};

// Forerunner SQL Server Reports
forerunner.ssr = forerunner.ssr || {};

$(function () {
    var widgets = forerunner.ssr.constants.widgets;
    var events = forerunner.ssr.constants.events;
    var locData = forerunner.localize.getLocData(forerunner.config.forerunnerFolder() + "ReportViewer/loc/ReportViewer");
    var reportProperties = locData.reportProperties;

    /**
     * Widget used to select a new dashbard template
     *
     * @namespace $.forerunner.createDashboard
     * @prop {Object} options - The options for the create dashboard dialog
     * @prop {String} options.reportManagerAPI - Path to the REST calls for the reportManager
     * @prop {Object} options.$appContainer - Dashboard container
     * @prop {Object} options.$dashboardEditor - Dashboard Editor widget
     * @prop {Object} options.reportId - Target Report Id
     *
     * @example
     * $("#reportPropertiesDialog").reportProperties({
     *      reportManagerAPI: me.options.reportManagerAPI,
     *      $appContainer: me.options.$appContainer,
     *      $dashboardEditor: me,
     *      reportId: e.target.name
     * });
     */
    $.widget(widgets.getFullname(widgets.reportProperties), {
        options: {
            reportManagerAPI: null,
            $appContainer: null,
            $dashboardEditor: null,
            reportId: null
        },
        _init: function () {
            var me = this;

            me.properties = me.options.$dashboardEditor.getReportProperties(me.options.reportId) || {};

            // Open the top level nodes and deselect any previous selection
            me.$tree.jstree("close_all");
            me.$tree.jstree("open_node", "j1_1");
            me.$tree.jstree("deselect_all", true);

            // Restore the report name
            if (me.properties &&
                me.properties.catalogItem &&
                me.properties.catalogItem.Name) {
                me.$reportInput.val(me.properties.catalogItem.Name);
            } else {
                me.$reportInput.val("");
            }

            // Restore the hide toolbar checkbox
            if (me.properties && me.properties.hideToolbar === true) {
                me.$hideToolbar.prop("checked", true);
            } else {
                me.$hideToolbar.prop("checked", false);
            }

            me._resetValidateMessage();
        },
        _createJSData: function (path) {
            var me = this;
            var nodeTree = {
                text: path,
                state: {
                    opened: true
                },
                children: []
            };
            me._createTreeItems(nodeTree, "catalog", path);
            return [nodeTree];
        },
        _createTreeItems: function (curNode, view, path) {
            var me = this;
            var items = me._getItems(view, path);
            $.each(items, function (index, item) {
                var newNode = {
                    text: item.Name,
                    li_attr: {
                        dataCatalogItem: item
                    },
                    children: []
                };
                curNode.children.push(newNode);
                if (item.Type === me._itemType.folder) {
                    me._createTreeItems(newNode, view, item.Path)
                } else if (item.Type === me._itemType.report) {
                    newNode.icon = "jstree-file"
                    newNode.li_attr.dataReport = true;
                }
            });
        },
        _create: function () {
            var me = this;

            me.element.html("");

            var headerHtml = forerunner.dialog.getModalDialogHeaderHtml("fr-icons24x24-setup", reportProperties.title, "fr-rp-cancel", reportProperties.cancel);
            var $dialog = $(
                "<div class='fr-core-dialog-innerPage fr-core-center'>" +
                    headerHtml +
                    "<form class='fr-rp-form fr-core-dialog-form'>" +
                        // Hide toolbar checkbox
                        "<div class='fr-rp-setting-container'>" +
                            "<label class='fr-rp-label'>" + reportProperties.hideToolbar + "</label>" +
                            "<input class='fr-rp-hide-toolbar-id fr-rp-checkbox' name='hideToolbar' type='checkbox'/>" +
                        "</div>" +
                        // Dropdown container
                        "<div class='fr-rp-dropdown-container'>" +
                            "<input type='text' autofocus='autofocus' placeholder='" + reportProperties.selectReport + "' class='fr-rp-report-input-id fr-rp-text-input fr-core-cursorpointer' readonly='readonly' allowblank='false' nullable='false' required='true'/><span class='fr-rp-error-span'/>" +
                            "<div class='fr-rp-dropdown-iconcontainer fr-core-cursorpointer'>" +
                                "<div class='fr-rp-dropdown-icon'></div>" +
                            "</div>" +
                        "</div>" +
                        // Popup container
                        "<div class='fr-rp-popup-container'>" +
                            "<div class='fr-report-tree-id fr-rp-tree-container'></div>" +
                        "</div>" +
                        // Submit conatiner
                        "<div class='fr-core-dialog-submit-container'>" +
                            "<div class='fr-core-center'>" +
                                "<input name='submit' type='button' class='fr-rp-submit-id fr-core-dialog-submit fr-core-dialog-button' value='" + reportProperties.submit + "' />" +
                            "</div>" +
                        "</div>" +
                    "</form>" +
                "</div>");

            me.element.append($dialog);

            me.$form = me.element.find(".fr-rp-form");
            me._validateForm(me.$form);

            me.$dropdown = me.element.find(".fr-rp-dropdown-container");
            me.$dropdown.on("click", function (e) {
                me._onClickTreeDropdown.apply(me, arguments);
            })

            me.$hideToolbar = me.element.find(".fr-rp-hide-toolbar-id");
            me.$reportInput = me.element.find(".fr-rp-report-input-id");
            me.$popup = me.element.find(".fr-rp-popup-container");
            me.$tree = me.element.find(".fr-report-tree-id");

            // Setup the report selector UI
            var JSData = me._createJSData("/");
            me.$tree.jstree({
                core: {
                    data: JSData
                }
            });
            me.$tree.on("changed.jstree", function (e, data) {
                me._onChangedjsTree.apply(me, arguments);
            });


            // Hook the cancel and submit events
            me.element.find(".fr-rp-cancel").on("click", function(e) {
                me.closeDialog();
            });
            me.element.find(".fr-rp-submit-id").on("click", function (e) {
                me._submit();
            });
            me.element.on(events.modalDialogGenericSubmit, function () {
                me._submit();
            });
            me.element.on(events.modalDialogGenericCancel, function () {
                me.closeDialog();
            });
        },
        _onChangedjsTree: function (e, data) {
            var me = this;

            // Set the value if this is a report
            if (data.node.li_attr.dataReport === true) {
                me.$reportInput.val(data.node.text);
                me.properties.catalogItem = data.node.li_attr.dataCatalogItem;
                me.$popup.hide();
            }
            else {
                me.$tree.jstree("toggle_node", data.node);
            }
        },
        _onClickTreeDropdown: function (e) {
            var me = this;
            // Show the popup
            var top = me.$dropdown.offset().top + me.$dropdown.height();
            var left = me.$dropdown.offset().left;
            var width = me.$dropdown.width();
            me.$popup.css({ top: top, left: left, width: width });
            me.$popup.toggle();
        },
        // _getItems will return back an array of CatalogItem objects where:
        //
        // var = CatalogItem {
        //          ID: string,     - GUID
        //          Name: string,   - Item Name
        //          Path: string,   - Item Path
        //          Type: number,   - itemType (see below)
        // }
        _getItems: function (view, path) {
            var me = this;
            var items = null;

            forerunner.ajax.ajax({
                dataType: "json",
                url: me.options.reportManagerAPI + "GetItems",
                async: false,
                data: {
                    view: view,
                    path: path
                },
                success: function (data) {
                    items = data;
                },
                error: function (data) {
                    console.log(data);
                }
            });

            return items;
        },
        // itemType is the number returned in the CatalogItem.Type member
        _itemType: {
            unknown: 0,
            folder: 1,
            report: 2,
            resource: 3,
            linkedReport: 4,
            dataSource: 5,
            model: 6,
            site: 7
        },
        /**
         * Open parameter set dialog
         *
         * @function $.forerunner.reportProperties#openDialog
         */
        openDialog: function () {
            var me = this;
            forerunner.dialog.showModalDialog(me.options.$appContainer, me);
        },
        _triggerClose: function (isSubmit) {
            var me = this;
            var data = {
                reportId: me.options.reportId,
                isSubmit: isSubmit
            };
            me._trigger(events.close, null, data);
        },
        _submit: function () {
            var me = this;

            if (me.$form.valid() === true) {
                me.properties.hideToolbar = me.$hideToolbar.prop("checked");
                me.options.$dashboardEditor.setReportProperties(me.options.reportId, me.properties);

                me._triggerClose(true);
                forerunner.dialog.closeModalDialog(me.options.$appContainer, me);
            }
        },
        /**
         * Close parameter set dialog
         *
         * @function $.forerunner.reportProperties#closeDialog
         */
        closeDialog: function () {
            var me = this;
            me._triggerClose(false);
            forerunner.dialog.closeModalDialog(me.options.$appContainer, me);
        },
        _validateForm: function (form) {
            form.validate({
                errorPlacement: function (error, element) {
                    error.appendTo($(element).parent().find("span"));
                },
                highlight: function (element) {
                    $(element).parent().find("span").addClass("fr-rp-error-position");
                    $(element).addClass("fr-rp-error");
                },
                unhighlight: function (element) {
                    $(element).parent().find("span").removeClass("fr-rp-error-position");
                    $(element).removeClass("fr-rp-error");
                }
            });
        },
        _resetValidateMessage: function () {
            var me = this;
            var error = locData.validateError;

            jQuery.extend(jQuery.validator.messages, {
                required: error.required,
                number: error.number,
                digits: error.digits
            });
        },
    }); //$.widget
});