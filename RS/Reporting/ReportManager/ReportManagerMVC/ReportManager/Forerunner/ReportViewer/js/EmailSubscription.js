﻿/**
 * @file Contains the email subscription widget.
 *
 */

// Assign or create the single globally scoped variable
var forerunner = forerunner || {};

// Forerunner SQL Server Reports objects
forerunner.ajax = forerunner.ajax || {};
forerunner.ssr = forerunner.ssr || {};
forerunner.ssr.constants = forerunner.ssr.constants || {};
forerunner.ssr.constants.events = forerunner.ssr.constants.events || {};

$(function () {
    var ssr = forerunner.ssr;
    var events = ssr.constants.events;
    var widgets = forerunner.ssr.constants.widgets;
    var locData = forerunner.localize;

    /**
     * Widget used to create email subscription
     *
     * @namespace $.forerunner.emailSubscription
     * @prop {Object} options - The options for emailSubscription
     * @prop {String} options.reportPath - Current report path
     * @prop {Object} options.$appContainer - Report page container
     * @prop {Object} options.subscriptionModel - Subscription model instance
     * @prop {String} options.paramList - Current report selected parameter list
     *
     * @example
     * $("#subscription").emailSubscription({
     *  reportPath : path
     *  $appContainer: $appContainer, 
     *  subscriptionModel : subscriptionModel,
     *  paramList: parameterList
     *  
     * });
    */
    $.widget(widgets.getFullname(widgets.emailSubscription), {
        options: {
            reportPath: null,
            $appContainer: null,
            subscriptionModel: null,
            paramList: null
        },
        _extensionSettings: null,
        _createDropDownForValidValues : function(validValues) {
            return forerunner.helper.createDropDownForValidValues(validValues);
        },
        _createRadioButtonsForValidValues : function(validValues, index) {
            return forerunner.helper.createRadioButtonsForValidValues(validValues, index);
        },
        _createDiv: function (listOfClasses) {
            var $div = new $("<div />");
            for (var i = 0; i < listOfClasses.length; i++) {
                $div.addClass(listOfClasses[i]);
            }
            return $div;
        },
        _createDropDownWithLabel: function (label, validValues) {
            var me = this;
            var id = forerunner.helper.guidGen();
            var $label = new $("<LABEL />");
            $label.attr("for", id);
            $label.append(label);
            var $retVal = me._createDropDownForValidValues(validValues);
            $retVal.attr("id", id);
            return $retVal;
        },
        _subscriptionData: null,
        _canEditComment: false,
        getSubscriptionInfo: function (subscriptionID) {
            var me = this;
            return me.options.subscriptionModel.subscriptionModel("getSubscription", subscriptionID);
        },
        _setSubscriptionOrSetDefaults : function() {
            var me = this;
            var subscriptionID = me._subscriptionID;

            //used two mediation Deferred object to help to make sure the format and schedule build sequence
            //deferred1, deferred2 will always be resolved, but the argument will be different
            //if success then pass return data, if fail pass nothing, the argument will be undefined
            var deferred1 = $.Deferred(),
                deferred2 = $.Deferred();

            //deferred1 for format field
            $.when(me._initExtensionOptions()).done(function (data1) { deferred1.resolve(data1); }).fail(function () { deferred1.resolve(); });

            //deferred2 for schedule field
            $.when(me._initProcessingOptions()).done(function (data2) { deferred2.resolve(data2); }).fail(function () { deferred2.resolve(); });

            $.when(deferred1, deferred2).done(function (data1, data2) {
                var subscriptionInfo;

                //build format field first
                if (data1 !== undefined) {
                    me._extensionSettings = data1;
                    me._initRenderFormat(data1);
                    me.$includeReport.prop("checked", true);
                    me.$includeLink.prop("checked", true);
                    if (subscriptionID) {
                        subscriptionInfo = me.options.subscriptionModel.subscriptionModel("getSubscription", subscriptionID);

                        me.$desc.val(subscriptionInfo.Description);
                        me._subscriptionData = subscriptionInfo;

                        var extensionSettings = subscriptionInfo.ExtensionSettings;
                        for (var i = 0; i < extensionSettings.ParameterValues.length; i++) {
                            if (extensionSettings.ParameterValues[i].Name === "TO") {
                                me.$to.val(extensionSettings.ParameterValues[i].Value);
                            }
                            if (extensionSettings.ParameterValues[i].Name === "CC") {
                                me.$cc.val(extensionSettings.ParameterValues[i].Value);
                            }
                            if (extensionSettings.ParameterValues[i].Name === "BCC") {
                                me.$bcc.val(extensionSettings.ParameterValues[i].Value);
                            }
                            if (extensionSettings.ParameterValues[i].Name === "ReplyTo") {
                                me.$replyTo.val(extensionSettings.ParameterValues[i].Value);
                            }

                            if (extensionSettings.ParameterValues[i].Name === "Subject") {
                                me.$subject.val(extensionSettings.ParameterValues[i].Value);
                            }
                            if (extensionSettings.ParameterValues[i].Name === "Comment") {
                                me.$comment.val(extensionSettings.ParameterValues[i].Value);
                            }
                            if (extensionSettings.ParameterValues[i].Name === "IncludeReport") {
                                if (extensionSettings.ParameterValues[i].Value === "True") {
                                    me.$includeReport.prop("checked", true);
                                } else {
                                    me.$includeReport.prop("checked", false);
                                }
                            }
                            if (extensionSettings.ParameterValues[i].Name === "IncludeLink") {
                                if (extensionSettings.ParameterValues[i].Value === "True") {
                                    me.$includeLink.prop("checked", true);
                                } else {
                                    me.$includeLink.prop("checked", false);
                                }
                            }
                            if (extensionSettings.ParameterValues[i].Name === "RenderFormat") {
                                me.$renderFormat.val(extensionSettings.ParameterValues[i].Value);
                            }
                        }
                    } else {
                        forerunner.ajax.getUserName(me.options.subscriptionModel.subscriptionModel("option", "rsInstance"), function (userName) {
                            me.$to.val(userName);
                            me.$desc.val(locData.getLocData().subscription.description.format(userName));
                            me.$subject.val(locData.getLocData().subscription.subject);
                        });
                    }
                }

                //build schedule field after format
                if (data2 !== undefined) {
                    me._initSharedSchedule(data2, function () {
                        if (subscriptionID) {
                            subscriptionInfo = me.options.subscriptionModel.subscriptionModel("getSubscription", subscriptionID);
                            me.$sharedSchedule.val(subscriptionInfo.SubscriptionSchedule.ScheduleID);
                        }
                    });
                }
            });
        },
        _getSubscriptionInfo: function() {
            var me = this;
            var i;
            if (!me._subscriptionData) {
                me._subscriptionData = {};
                me._subscriptionData.SubscriptionID = null;
                me._subscriptionData.Report = me.options.reportPath;
                me._subscriptionData.SubscriptionSchedule = {};
                me._subscriptionData.SubscriptionSchedule.ScheduleID = me.$sharedSchedule.val();
                me._subscriptionData.SubscriptionSchedule.MatchData = me._sharedSchedule[me.$sharedSchedule.val()].MatchData;
                if (me._sharedSchedule[me.$sharedSchedule.val()].IsMobilizerSchedule)
                    me._subscriptionData.SubscriptionSchedule.IsMobilizerSchedule = true;
                me._subscriptionData.Description = me.$desc.val();
                me._subscriptionData.EventType = "TimedSubscription";
                me._subscriptionData.ExtensionSettings = {};
                me._subscriptionData.ExtensionSettings.Extension = "Report Server Email";
                me._subscriptionData.ExtensionSettings.ParameterValues = [];
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "TO", "Value": me.$to.val() });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "CC", "Value": me.$cc.val() });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "BCC", "Value": me.$bcc.val() });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "ReplyTo", "Value": me.$replyTo.val() });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "Subject", "Value": me.$subject.val() });
                if (me.$comment.val() && me.$comment.val() !== "")
                    me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "Comment", "Value": me.$comment.val() });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "IncludeLink", "Value": me.$includeLink.is(":checked") ? "True" : "False" });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "IncludeReport", "Value": me.$includeReport.is(":checked") ? "True" : "False" });
                me._subscriptionData.ExtensionSettings.ParameterValues.push({ "Name": "RenderFormat", "Value":  me.$renderFormat.val() });
            } else {
                me._subscriptionData.Report = me.options.reportPath;
                me._subscriptionData.Description = me.$desc.val();
                me._subscriptionData.SubscriptionSchedule = {};
                me._subscriptionData.SubscriptionSchedule.ScheduleID = me.$sharedSchedule.val();
                me._subscriptionData.SubscriptionSchedule.MatchData = me._sharedSchedule[me.$sharedSchedule.val()].MatchData;
                if (me._sharedSchedule[me.$sharedSchedule.val()].IsMobilizerSchedule)
                    me._subscriptionData.SubscriptionSchedule.IsMobilizerSchedule = true;
                for (i = 0; i < me._subscriptionData.ExtensionSettings.ParameterValues.length; i++) {
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "TO") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$to.val();
                    }
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "CC") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$cc.val();
                    }
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "BCC") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$bcc.val();
                    }
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "ReplyTo") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$replyTo.val();
                    }

                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "Subject") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$subject.val();
                    }

                    if (me._canEditComment && me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "Comment") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$comment.val();
                    }

                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "IncludeLink") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$includeLink.is(":checked") ? "True" : "False";
                    }
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "IncludeReport") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$includeReport.is(":checked") ? "True" : "False";
                    }
                    if (me._subscriptionData.ExtensionSettings.ParameterValues[i].Name === "RenderFormat") {
                        me._subscriptionData.ExtensionSettings.ParameterValues[i].Value = me.$renderFormat.val();
                    }
                }
            }
            if (me.options.paramList && !me._subscriptionData.Parameters) {
                me._subscriptionData.Parameters = [];
                var paramListObj = JSON.parse(me.options.paramList);
                for (i = 0; i < paramListObj.ParamsList.length; i++) {
                    var param = paramListObj.ParamsList[i];
                    if (param.UseDefault && param.UseDefault.toLowerCase() === "true")
                        continue;
                    if (param.IsMultiple === "true") {
                        for (var j = 0; j < param.Value.length; j++) {
                            me._subscriptionData.Parameters.push({ "Name": param.Parameter, "Value": param.Value[j] });
                        }
                    } else {
                        me._subscriptionData.Parameters.push({"Name": param.Parameter, "Value": param.Value});
                    }
                }
            }
            return me._subscriptionData;
        },
        getParamsList: function () {
            var me = this;
            var paramList = { "ParamsList": [] };
            if (me._subscriptionData) {
                for (var i = 0; i < me._subscriptionData.Parameters.length; i++) {
                    paramList.ParamsList.push({ "Parameter": me._subscriptionData.Parameters[i].Name, "Value": me._subscriptionData.Parameters[i].Value });
                }
            }
            return paramList.ParamsList.length > 0 ? JSON.stringify(paramList) : null;
        },
        _initRenderFormat : function (data) {
            var me = this;

            for (var i = 0; i < data.length; i++) {
                var setting = data[i];
                if (setting.Name === "RenderFormat") {
                    me.$renderFormat = me._createDropDownForValidValues(setting.ValidValues);
                }
            }

            var value = forerunner.config.getCustomSettingsValue("DefaultSubscriptionFormat", "MHTML");
            me.$renderFormat.val(value);
            me.$renderFormat.addClass(".fr-email-renderformat");
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.format, me.$renderFormat));
        },
        _initExtensionOptions: function () {
            var me = this;
            return me.options.subscriptionModel.subscriptionModel("getExtensionSettings", "Report Server Email");
        },
        _sharedSchedule: {},
        _initSharedSchedule:function(data,done) {
            var me = this;
            var validValues = [];
            var i;

            for (i = 0; i < data.length; i++) {
                validValues.push({ Value: data[i].ScheduleID, Label: data[i].Name });
                me._sharedSchedule[data[i].ScheduleID] = data[i];
            }


           forerunner.config.getMobilizerSharedSchedule(function (schedule) {
                data = schedule;
                if (data) {
                    for (i = 0; i < data.length; i++) {
                        validValues.push({ Value: data[i].ScheduleID, Label: data[i].Name });
                        me._sharedSchedule[data[i].ScheduleID] = data[i];
                    }
                }
                me.$sharedSchedule = me._createDropDownForValidValues(validValues);
                me.$theTable.append(me._createTableRow(locData.getLocData().subscription.schedule, me.$sharedSchedule));
                me.$sharedSchedule.addClass("fr-email-schedule");
                done();
            });
        },
        _initProcessingOptions: function () {
            var me = this;
            return me.options.subscriptionModel.subscriptionModel("getSchedules");
        },
        _initSections : function () {
            var me = this;
            me._setSubscriptionOrSetDefaults();
        },
        _createInputWithPlaceHolder: function (listOfClasses, type, name, placeholder) {
            var me = this;
            var $input = new $("<INPUT />");
            $input.attr("type", type);
            if (name) $input.attr("name", name);

            if (placeholder)
                $input.watermark(placeholder, forerunner.config.getWatermarkConfig());
            for (var i = 0; i < listOfClasses.length; i++) {
                $input.addClass(listOfClasses[i]);
            }
            return $input;
        },
        _createTextAreaWithPlaceHolder: function (listOfClasses, placeholder) {
            var me = this;
            var $input = new $("<TEXTAREA />");
            if (placeholder)
                $input.watermark(placeholder, forerunner.config.getWatermarkConfig());
            for (var i = 0; i < listOfClasses.length; i++) {
                $input.addClass(listOfClasses[i]);
            }
            return $input;
        },
        _createTableRow: function (label, $div2) {
            var me = this;
            var $row = new $("<TR/>");
            var $col1 = new $("<TD/>");
            $col1.addClass("fr-sub-left-col");
            var $col2 = new $("<TD/>");
            $col2.addClass("fr-sub-right-col");
            $row.append($col1);
            $row.append($col2);
            if (label)
                $col1.append(label);
            if ($div2)
                $col2.append($div2);
            return $row;
        },
        _createCheckBox: function ($div, label) {
            var me = this;
            var $cb = new $("<INPUT />");
            var id = forerunner.helper.guidGen();
            $cb.attr("type", "checkbox");
            $cb.attr("id", id);
            if ($div && label) {
                var $label = new $("<LABEL />");
                $label.attr("for", id);
                $label.append(label);
                $div.append($cb);
                $div.append($label);
            }
            return $cb;
        },
        _init : function () {
        },
        _subscriptionID: null,
        /**
         * Get current report's subscription data
         *
         * @function $.forerunner.emailSubscription#getSubscriptionList
         *
         * @return {Object} The xml http requeset for current report's subscription loading
         */
        getSubscriptionList : function() {
            var me = this;
            return me.options.subscriptionModel.subscriptionModel("getSubscriptionList", me.options.reportPath);
        },
        /**
         * Generate email subscription dialog
         *
         * @function $.forerunner.emailSubscription#loadSubscription
         *
         * @param {String} Subscription id, if not exist set it to null
         */
        loadSubscription: function (subscripitonID) {
            var me = this;

            me.element.off(events.modalDialogGenericSubmit);
            me.element.off(events.modalDialogGenericCancel);

            me._subscriptionID = subscripitonID;
            me._subscriptionData = null;
            me.element.html("");
            me.element.off(events.modalDialogGenericSubmit);
            me.element.off(events.modalDialogGenericCancel);
            me.$outerContainer = me._createDiv(["fr-core-dialog-innerPage", "fr-core-center"]);
            var headerHtml = subscripitonID ? forerunner.dialog.getModalDialogHeaderHtml("fr-icons24x24-emailsubscription", locData.getLocData().subscription.email, "fr-email-cancel", locData.getLocData().subscription.cancel, "fr-core-dialog-button fr-email-create-id", locData.getLocData().subscription.addNew) :
                forerunner.dialog.getModalDialogHeaderHtml("fr-icons24x24-emailsubscription", locData.getLocData().subscription.email, "fr-email-cancel", locData.getLocData().subscription.cancel);

            me.$theForm = new $("<FORM />");
            me.$theForm.addClass("fr-email-form");
            me.$theForm.addClass("fr-core-dialog-form");
            me.$outerContainer.append(headerHtml);
            me.$outerContainer.append(me.$theForm);

            me.$theTable = new $("<TABLE />");
            me.$theTable.addClass("fr-email-table");
            me.$theForm.append(me.$theTable);
            me.$desc = me._createInputWithPlaceHolder(["fr-email-description"], "text", "desc", "");  //locData.getLocData().subscription.descriptionPlaceholder
            me.$desc.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$desc.prop("required", true);
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.descriptionPlaceholder, me.$desc));

            me.$to = me._createInputWithPlaceHolder(["fr-email-to"], "text", "to", "");  //locData.getLocData().subscription.toPlaceholder
            me.$to.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$to.prop("required", true);
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.toPlaceholder, me.$to));

            me.$cc = me._createInputWithPlaceHolder(["fr-email-cc"], "text", "cc", "");  //locData.getLocData().subscription.toPlaceholder
            me.$cc.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.ccPlaceholder, me.$cc));

            me.$bcc = me._createInputWithPlaceHolder(["fr-email-bcc"], "text", "bcc", "");  //locData.getLocData().subscription.toPlaceholder
            me.$bcc.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.bccPlaceholder, me.$bcc));

            me.$replyTo = me._createInputWithPlaceHolder(["fr-email-replyTo"], "text", "replyTo", "");  //locData.getLocData().subscription.toPlaceholder
            me.$replyTo.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.replyToPlaceholder, me.$replyTo));

            me.$subject = me._createInputWithPlaceHolder(["fr-email-subject"], "text", "subject", "");  // locData.getLocData().subscription.subjectPlaceholder
            me.$subject.attr("maxlength", forerunner.config.getCustomSettingsValue("SubscriptionInputSize", "100"));
            me.$subject.prop("required", true);
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.subjectPlaceholder, me.$subject));

            me.$includeLink = me._createCheckBox();
            me.$includeLink.addClass("fr-email-include");
            me.$includeReport = me._createCheckBox();
            me.$includeReport.addClass("fr-email-include");
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.includeLink, me.$includeLink));
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.includeReport, me.$includeReport));

            me.$comment = me._createTextAreaWithPlaceHolder(["fr-email-comment"], "Comment", locData.getLocData().subscription.commentPlaceholder);
            me.$theTable.append(me._createTableRow(locData.getLocData().subscription.commentPlaceholder, me.$comment));
            

            if (!me.options.userSettings || !me.options.userSettings.adminUI) {
                me.$to.prop("disabled", true);
                me.$subject.parent().parent().hide();
                me.$desc.parent().parent().hide();
                me.$comment.parent().parent().hide();
                me.$bcc.parent().parent().hide();
                me.$cc.parent().parent().hide();
                me.$replyTo.parent().parent().hide();
            }
            forerunner.ajax.hasPermission(me.options.reportPath, "Create Any Subscription", me.options.subscriptionModel.subscriptionModel("option","rsInstance"), function (canEditComment) {
                if (canEditComment) {
                    me.$comment.parent().parent().hide();
                }
            });
            me.$lastRow = me._createTableRow();
            me.$colOfLastRow = me.$lastRow.children(":first");
            me.$theTable.append(me.$lastRow);

            me.$submitContainer = me._createDiv(["fr-email-submit-container"]);
            me.$submitButton = me._createInputWithPlaceHolder(["fr-email-submit-id", "fr-core-dialog-submit", "fr-core-dialog-button"], "submit");
            me.$submitButton.val(locData.getLocData().subscription.save);
            me.$submitContainer.append(me.$submitButton);
            
            
            if (subscripitonID) {
                me.$deleteButton = me._createInputWithPlaceHolder(["fr-email-delete-id", "fr-core-dialog-delete"], "button");
                me.$deleteButton.val(locData.getLocData().subscription.deleteSubscription);
                me.$submitContainer.append(me.$deleteButton);
            }
            me.$theForm.append(me.$submitContainer);
            me._initSections();
            me.element.append(me.$outerContainer);

            //disable form auto submit when click enter on the keyboard
            me.$theForm.on("submit", function () { return false; });

            me.$theForm.validate({
                errorPlacement: function (error, element) {
                    error.appendTo(element.siblings("span"));
                },
                highlight: function (element) {
                    $(element).addClass("fr-error");
                },
                unhighlight: function (element) {
                    $(element).removeClass("fr-error");
                }
            });

            me.element.find(".fr-email-submit-id").on("click", function (e) {
                
                me._submit();
            });

            me.element.find(".fr-email-create-id").on("click", function (e) {
                me._createNew();
            });

            me.element.find(".fr-email-delete-id").on("click", function (e) {
                me._deleteMe();
            });

            me.element.find(".fr-email-cancel").on("click", function (e) {
                me.closeDialog();
            });

            me.element.on(events.modalDialogGenericSubmit, function () {             
                me._submit();
            });

            me.element.on(events.modalDialogGenericCancel, function () {
                me.closeDialog();
            });

            me.options.$appContainer.trigger(events.subscriptionFormInit);
        },

        _submit : function () {
            var me = this;

            if (me.$theForm.valid() && me.$to.val() !== "" && me.$desc.val() !== "" && me.$subject.val() !== "" && me.$to.attr("data-invalid") !== "true") {
                var subscriptionInfo = me._getSubscriptionInfo();

                me.options.subscriptionModel.subscriptionModel(
                    me._subscriptionID ? "updateSubscription" : "createSubscription",
                    subscriptionInfo,
                    function () { me.closeDialog(); },
                    function (data) {
                        forerunner.dialog.showMessageBox(me.options.$appContainer, data.Exception.Message ? data.Exception.Message : locData.getLocData().subscription.saveFailed);
                    });
            }
        },

        _createNew: function () {
            var me = this;
            me.loadSubscription(null);
        },

        _deleteMe: function () {
            var me = this;
            me.options.subscriptionModel.subscriptionModel(
               "deleteSubscription",
               me._subscriptionID,
               function () { me.closeDialog(); },
               function () { forerunner.dialog.showMessageBox(me.options.$appContainer, locData.getLocData().subscription.deleteFailed); });
        },
        /**
         * Open email subscription dialog
         *
         * @function $.forerunner.emailSubscription#openDialog
         */
        openDialog: function () {
            var me = this;
            forerunner.dialog.showModalDialog(me.options.$appContainer, me);
        },
        /**
         * Close email subscription dialog
         *
         * @function $.forerunner.emailSubscription#closeDialog
         */
        closeDialog: function () {
            var me = this;
            forerunner.dialog.closeModalDialog(me.options.$appContainer, me);          
        },
        /**
         * Removes the email subscription functionality completely. This will return the element back to its pre-init state.
         *
         * @function $.forerunner.emailSubscription#destroy
         */
        destroy: function () {
            var me = this;

            me.element.off(events.modalDialogGenericSubmit);
            me.element.off(events.modalDialogGenericCancel);
            me.element.html("");
            this._destroy();
        }
    });  // $.widget(
});  // $(function ()
