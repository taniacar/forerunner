﻿// Assign or create the single globally scoped variable
var forerunner = forerunner || {};

// Forerunner SQL Server Reports
forerunner.ssr = forerunner.ssr || {};

$(function () {

   
    //  The ReportIemContext simplifies the signature for all of the functions to pass context around
    function reportItemContext(RS, CurrObj, CurrObjIndex, CurrObjParent, $HTMLParent, Style, CurrLocation) {
        this.RS = RS;
        this.CurrObj = CurrObj;
        this.CurrObjIndex = CurrObjIndex;
        this.CurrObjParent = CurrObjParent;
        this.$HTMLParent = $HTMLParent;
        this.Style = Style;
        this.CurrLocation = CurrLocation;
    }
    function layout() {
        this.ReportItems = {};
        this.Height = 0;
        this.LowestIndex = null;
    }
    // Temp measurement mimics the server measurement object
    function tempMeasurement(height, width) {
        this.Height = height;
        this.Width = width;
    }
    //  Report Item Location is used my the layout to absolute position objects in a rectangle/section/column
    function reportItemLocation(index) {
        this.TopDelta = 0;
        this.Height = 0;
        this.Index = index;
        this.IndexAbove = null;
        this.NewHeight = null;
        this.NewTop = null;
    }
    // The Floating header object holds pointers to the tablix and its row and col header objects
    function floatingHeader($tablix, $rowHeader, $colHeader) {
        this.$tablix = $tablix;
        this.$rowHeader = $rowHeader;
        this.$colHeader = $colHeader;
    }
    // report render widget
    $.widget("Forerunner.reportRender", {
        // Default options
        options: {
            reportViewer: null,
        },
        // Constructor
        _create: function () {
            
        },

        render: function (reportObj) {
            var me = this;
            var reportDiv = me.element;
            var reportViewer = me.options.reportViewer;
            

            me._writeExportPanel();

            reportDiv.attr("Style", me._getStyle(reportViewer, reportObj.ReportContainer.Report.PageContent.PageStyle));
            $.each(reportObj.ReportContainer.Report.PageContent.Sections, function (Index, Obj) { me._writeSection(new reportItemContext(reportViewer, Obj, Index, reportObj.ReportContainer.Report.PageContent, reportDiv, "")); });
        },
        writeError: function (errorData) {
            var me = this;
            var errorTag = forerunner.ssr.constants.errorTag;

            me.element.html($(
                "<div class='fr-render-error-message'></div>" +
                "<div class='fr-render-error-details'>" + errorTag.moreDetail + "</div>" +
                "<div class='fr-render-error'><h3>" + errorTag.serverError + "</h3>" +
                "<div class='fr-render-error fr-render-error-type'></div>" +
                "<div class='fr-render-error fr-render-error-targetsite'></div>" +
                "<div class='fr-render-error fr-render-error-source'></div>" +
                "<div class='fr-render-error fr-render-error-stacktrace'></div>" +
                "</div>"));

            if (me.options.reportViewer) {
                var $cell;

                $cell = me.element.find(".fr-render-error");
                $cell.hide();

                $cell = me.element.find(".fr-render-error-details");
                $cell.on("click", { $Detail: me.element.find(".fr-render-error") }, function (e) { e.data.$Detail.show(); $(e.target).hide(); });

                $cell = me.element.find(".fr-render-error-type");
                $cell.append("<h4>" + errorTag.type + ":</h4>" + errorData.Exception.Type);

                $cell = me.element.find(".fr-render-error-targetsite");
                $cell.html("<h4>" + errorTag.targetSite + ":</h4>" + errorData.Exception.TargetSite);

                $cell = me.element.find(".fr-render-error-source");
                $cell.html("<h4>" + errorTag.source + ":</h4>" + errorData.Exception.Source);

                $cell = me.element.find(".fr-render-error-message");
                $cell.html("<h4>" + errorTag.message + ":</h4>" + errorData.Exception.Message);

                $cell = me.element.find(".fr-render-error-stacktrace");
                $cell.html("<h4>" + errorTag.stackTrace + ":</h4>" + errorData.Exception.StackTrace);
            }
        },

        _writeSection: function (RIContext) {
            var me = this;
            var $newObj = me._getDefaultHTMLTable();
            var $sec = $("<TR/>");
            var location = me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex);

            //Need to determine Header and footer Index
            var headerIndex;
            var footerIndex;
            if (RIContext.CurrObj.PageFooter) {
                footerIndex = RIContext.CurrObj.Columns.length;
                headerIndex = footerIndex + 1;
            }
            else
                headerIndex = RIContext.CurrObj.Columns.length;


            //Page Header
            if (RIContext.CurrObj.PageHeader) {
                var $header = $("<TR/>");
                var $headerTD = $("<TD/>");
                $header.append($headerTD);
                var headerLoc = me._getMeasurmentsObj(RIContext.CurrObj, headerIndex);
                $header.attr("Style", "width:" + headerLoc.Width + "mm;");
                $headerTD.append(me._writeRectangle(new reportItemContext(RIContext.RS, RIContext.CurrObj.PageHeader, headerIndex, RIContext.CurrObj, new $("<DIV/>"), null, headerLoc)));
                $newObj.append($header);
            }
            
            $sec.attr("Style", "width:" + location.Width + "mm;");
            //Columns
            $newObj.append($sec);
            $.each(RIContext.CurrObj.Columns, function (index, obj) {
                var $col = new $("<TD/>");
                $col.append(me._writeRectangle(new reportItemContext(RIContext.RS, obj, index, RIContext.CurrObj, new $("<Div/>"), null, location)));
                $sec.append($col);
            });

            //Page Footer
            if (RIContext.CurrObj.PageFooter) {
                var $footer = $("<TR/>");
                var $footerTD = $("<TD/>");
                $footer.append($footerTD);
                var footerLoc = me._getMeasurmentsObj(RIContext.CurrObj, footerIndex);
                $footer.attr("Style", "width:" + footerLoc.Width + "mm;");
                $footerTD.append(me._writeRectangle(new reportItemContext(RIContext.RS, RIContext.CurrObj.PageFooter, footerIndex, RIContext.CurrObj, new $("<DIV/>"), "", footerLoc)));
                $newObj.append($footer);
            }


            RIContext.$HTMLParent.append($newObj);
        },
        _writeRectangle: function (RIContext) {
            var $RI;        //This is the ReportItem Object
            var $LocDiv;    //This DIV will have the top and left location set, location is not set anywhere else
            var Measurements;
            var RecLayout;
            var Style;
            var me = this;

            Measurements = RIContext.CurrObj.Measurement.Measurements;
            RecLayout = me._getRectangleLayout(Measurements);

            $.each(RIContext.CurrObj.ReportItems, function (Index, Obj) {
        
                Style = "";
                if (Obj.Type !== "Line") {
                    Style = "display:table;border-collapse:collapse;";
                    Style += me._getFullBorderStyle(Obj);
                }

                $RI = me._writeReportItems(new reportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, new $("<Div/>"), Style, Measurements[Index]));
                       
                $LocDiv = new $("<Div/>");
                $LocDiv.append($RI);
                Style = "";

                //Determin height and location
                if (Obj.Type === "Image" || Obj.Type === "Chart" || Obj.Type === "Gauge" || Obj.Type === "Map" || Obj.Type === "Line")
                    RecLayout.ReportItems[Index].NewHeight = Measurements[Index].Height;
                else
                    RecLayout.ReportItems[Index].NewHeight = me._getHeight($RI);

                if (RecLayout.ReportItems[Index].IndexAbove === null)
                    RecLayout.ReportItems[Index].NewTop = Measurements[Index].Top;
                else
                    RecLayout.ReportItems[Index].NewTop = parseFloat(RecLayout.ReportItems[RecLayout.ReportItems[Index].IndexAbove].NewTop) + parseFloat(RecLayout.ReportItems[RecLayout.ReportItems[Index].IndexAbove].NewHeight) + parseFloat(RecLayout.ReportItems[Index].TopDelta);
                Style += "position:absolute;top:" + RecLayout.ReportItems[Index].NewTop + "mm;left:" + Measurements[Index].Left + "mm;";

                //Background color and border go on container
                if (RIContext.CurrObj.ReportItems[Index].Element && RIContext.CurrObj.ReportItems[Index].Elements.SharedElements.Style && RIContext.CurrObj.ReportItems[Index].Elements.SharedElements.Style.BackgroundColor)
                    Style += "background-color:" + RIContext.CurrObj.ReportItems[Index].Elements.SharedElements.Style.BackgroundColor + ";";
                else if (RIContext.CurrObj.ReportItems[Index].Element  && RIContext.CurrObj.ReportItems[Index].Elements.NonSharedElements.Style && RIContext.CurrObj.ReportItems[Index].Elements.NonSharedElements.Style.BackgroundColor)
                    Style += "background-color:" + RIContext.CurrObj.ReportItems[Index].Elements.NonSharedElements.Style.BackgroundColor + ";";
        
                $LocDiv.attr("Style", Style);
                $LocDiv.append($RI);
                RIContext.$HTMLParent.append($LocDiv);
            });

            Style = "position:relative;" + me._getElementsStyle(RIContext.RS, RIContext.CurrObj.Elements);
            Style += me._getFullBorderStyle(RIContext.CurrObj);

            if (RIContext.CurrLocation) {
                Style += "width:" + RIContext.CurrLocation.Width + "mm;";
                if (RIContext.CurrObj.ReportItems.length === 0)
                    Style += "height:" + RIContext.CurrLocation.Height + "mm;";
                else {
                    var parentHeight = parseFloat(RecLayout.ReportItems[RecLayout.LowestIndex].NewTop) + parseFloat(RecLayout.ReportItems[RecLayout.LowestIndex].NewHeight) + (parseFloat(RIContext.CurrLocation.Height) - (parseFloat(Measurements[RecLayout.LowestIndex].Top) + parseFloat(Measurements[RecLayout.LowestIndex].Height)));
                    Style += "height:" + parentHeight + "mm;";
                }
        
            }
            RIContext.$HTMLParent.attr("Style", Style);

            return RIContext.$HTMLParent;
        },
        _getRectangleLayout: function (Measurements) {
            var l = new layout();
            var me = this;

            $.each(Measurements, function (Index, Obj) {
                l.ReportItems[Index] = new reportItemLocation(Index);
                var curRI = l.ReportItems[Index];

                if (me.isNull(l.LowestIndex))
                    l.LowestIndex = Index;
                else if (Obj.Top + Obj.Height > Measurements[l.LowestIndex].Top + Measurements[l.LowestIndex].Height)
                    l.LowestIndex = Index;

                for (var i = 0; i < Measurements.length; i++) {
                    var bottom =  Measurements[i].Top + Measurements[i].Height;
                    //var right = Measurements[i].Left + Measurements[i].Width;
                    if ((Obj.Top > bottom) //&& (
                        //    ((Obj.Left > Measurements[i].Left) && (Obj.Left < right)) ||
                        //     ((Obj.Left + Obj.Width > Measurements[i].Left) && (Obj.Left + Obj.Width < right)) ||
                        //     ((Obj.Left < Measurements[i].Left) && (Obj.Left + Obj.Width > right))
                        // )
                        )
            
                    {
                        if (!curRI.IndexAbove){
                            curRI.IndexAbove = i;
                            curRI.TopDelta = Obj.Top - bottom;
                        }
                        else if (bottom > Measurements[curRI.IndexAbove].Top + Measurements[curRI.IndexAbove].Height){
                            curRI.IndexAbove = i;
                            curRI.TopDelta = Obj.Top - bottom;
                        }
                    }
                }
               
            });
    
            return l;
        },
        _writeReportItems: function (RIContext) {
            var me = this;

            switch (RIContext.CurrObj.Type) {
                case "RichTextBox":
                    return me._writeRichText(RIContext);
                    //break;
                case "Image":
                case "Chart":
                case "Gauge":
                case "Map":
                    return me._writeImage(RIContext);
                    //break;
                case "Tablix":
                    return me._writeTablix(RIContext);
                    //break;
                case "Rectangle":
                    return me._writeRectangle(RIContext);
                    //break;
                case "SubReport":
                    return me._writeSubreport(RIContext);
                    //break;
                case "Line":
                    return me._writeLine(RIContext);
                    //break;
            }
        },
        _writeRichText: function (RIContext) {
            var Style = RIContext.Style;
            var $TextObj = $("<div/>");
            var $Sort = null;
            var me = this;

            Style += "display:table;";
            if (me._getMeasurements(me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex), true) !== "")
                Style += me._getMeasurements(me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex), true);
            Style += me._getElementsNonTextStyle(RIContext.RS, RIContext.CurrObj.Elements);
    
            RIContext.$HTMLParent.attr("Style", Style);

            if (RIContext.CurrObj.Elements.SharedElements.IsToggleParent === true || RIContext.CurrObj.Elements.NonSharedElements.IsToggleParent === true) {
                var $Drilldown = $("<div/>");
                $Drilldown.attr("id", RIContext.CurrObj.Elements.NonSharedElements.UniqueName);
                $Drilldown.html("&nbsp");

                if (RIContext.CurrObj.Elements.NonSharedElements.ToggleState !== undefined && RIContext.CurrObj.Elements.NonSharedElements.ToggleState === true)
                    $Drilldown.addClass("fr-render-drilldown-collapse");
                else
                    $Drilldown.addClass("fr-render-drilldown-expand");

                $Drilldown.on("click", {ToggleID: RIContext.CurrObj.Elements.NonSharedElements.UniqueName }, function (e) { me.options.reportViewer.toggleItem(e.data.ToggleID); });
                $Drilldown.addClass("fr-report-cursor-pointer");
                RIContext.$HTMLParent.append($Drilldown);
            }
            if (RIContext.CurrObj.Elements.SharedElements.CanSort !== undefined) {
                $Sort = $("<div/>");
                $Sort.html("&nbsp");
                var Direction = "None";
                var sortDirection = forerunner.ssr.constants.sortDirection;

                if (RIContext.CurrObj.Elements.NonSharedElements.SortState === 2) {
                    $Sort.attr("class", "fr-render-sort-descending");
                    Direction = sortDirection.desc;
                }
                else if (RIContext.CurrObj.Elements.NonSharedElements.SortState === 1) {
                    $Sort.attr("class", "fr-render-sort-ascending");
                    Direction = sortDirection.asc;
                }
                else
                    $Sort.attr("class", "fr-render-sort-unsorted");

                $Sort.on("click", { Viewer:  RIContext.RS, SortID: RIContext.CurrObj.Elements.NonSharedElements.UniqueName, Direction: Direction }, function (e) { e.data.Viewer.sort(e.data.Direction, e.data.SortID); });
                RIContext.$HTMLParent.append($Sort);
            }
            me._writeActions(RIContext, RIContext.CurrObj.Elements.NonSharedElements, $TextObj);

            Style = "display: table-cell;white-space:pre-wrap;word-break:break-word;word-wrap:break-word;";
            Style += me._getElementsTextStyle(RIContext.CurrObj.Elements);
            $TextObj.attr("Style", Style);

            if (RIContext.CurrObj.Paragraphs.length === 0) {
                if (RIContext.CurrObj.Elements.SharedElements.Value)
                    $TextObj.html(RIContext.CurrObj.Elements.SharedElements.Value);
                else if (RIContext.CurrObj.Elements.NonSharedElements.Value)
                    $TextObj.html(RIContext.CurrObj.Elements.NonSharedElements.Value);
                else
                    $TextObj.html("&nbsp");
            }
            else {
                //Handle each paragraphs
                var LowIndex = null;
                var ParentName = {};
                var ParagraphContainer = {};
                ParagraphContainer.Root = "";

                //Build paragraph tree
    
                $.each(RIContext.CurrObj.Paragraphs, function (Index, Obj) {

                    if (LowIndex === null)
                        LowIndex = Obj.Paragraph.SharedElements.ListLevel;
                    if (!ParagraphContainer[Obj.Paragraph.SharedElements.ListLevel])
                        ParagraphContainer[Obj.Paragraph.SharedElements.ListLevel] = [];
                    ParentName[Obj.Paragraph.SharedElements.ListLevel] = Obj.Paragraph.NonSharedElements.UniqueName;

                    var item;
                    if (!ParentName[Obj.Paragraph.SharedElements.ListLevel - 1])
                        item = "Root";
                    else
                        item = ParentName[Obj.Paragraph.SharedElements.ListLevel - 1];
                    item = { Parent: item, Value: Obj };
                    ParagraphContainer[Obj.Paragraph.SharedElements.ListLevel].push(item);
                });

                me._writeRichTextItem(RIContext, ParagraphContainer, LowIndex, "Root", $TextObj);
            }
            me._writeBookMark(RIContext);
    
            //RIContext.$HTMLParent.append(ParagraphContainer["Root"]);
            RIContext.$HTMLParent.append($TextObj);
            if ($Sort) RIContext.$HTMLParent.append($Sort);
            return RIContext.$HTMLParent;
        },
        _writeRichTextItem: function (RIContext, Paragraphs, Index, ParentName, ParentContainer) {
            var $ParagraphList = null;
            var me = this;

            $.each(Paragraphs[Index], function (SubIndex, Obj) {
                if (Obj.Parent === ParentName) {
                    var $ParagraphItem;
                    Obj = Obj.Value;
                    if (Obj.Paragraph.SharedElements.ListStyle === 1) {
                        if (!$ParagraphList || !$ParagraphList.is("ol")) $ParagraphList = new $("<OL />");
                        $ParagraphList.addClass(me._getListStyle(1, Obj.Paragraph.SharedElements.ListLevel));

                        $ParagraphItem = new $("<LI />");
                    }
                    else if (Obj.Paragraph.SharedElements.ListStyle === 2) {
                        if (!$ParagraphList || !$ParagraphList.is("ul")) $ParagraphList = new $("<UL />");
                        $ParagraphList.addClass(me._getListStyle(2, Obj.Paragraph.SharedElements.ListLevel));

                        $ParagraphItem = new $("<LI />");
                    }
                    else {
                        if (!$ParagraphList || !$ParagraphList.is("div")) $ParagraphList = new $("<DIV />");
                        $ParagraphItem = new $("<DIV />");
                    }

                    var ParagraphStyle = "";
                    ParagraphStyle += me._getMeasurements(me._getMeasurmentsObj(Obj, Index));
                    ParagraphStyle += me._getElementsStyle(RIContext.RS, Obj.Paragraph);
                    $ParagraphItem.attr("Style", ParagraphStyle);
                    $ParagraphItem.attr("name", Obj.Paragraph.NonSharedElements.UniqueName);

                    //Handle each TextRun
                    for (var i = 0; i < Obj.TextRunCount; i++) {
                        var $TextRun;
                        var flag = true;
                        //With or without Action in TextRun
                        if (!Obj.TextRuns[i].Elements.NonSharedElements.ActionInfo) {
                            $TextRun = new $("<SPAN />");
                        }
                        else {
                            $TextRun = new $("<A />");
                            me._writeActions(RIContext, Obj.TextRuns[i].Elements.NonSharedElements, $TextRun);
                        }

                        if (Obj.TextRuns[i].Elements.SharedElements.Value && Obj.TextRuns[i].Elements.SharedElements.Value !== "") {
                            $TextRun.html(Obj.TextRuns[i].Elements.SharedElements.Value);
                        }
                        else if (Obj.TextRuns[i].Elements.NonSharedElements.Value && Obj.TextRuns[i].Elements.NonSharedElements.Value !== "") {
                            $TextRun.html(Obj.TextRuns[i].Elements.NonSharedElements.Value);
                        }
                        else {
                            $TextRun.html("&nbsp");
                            flag = false;
                        }

                        $TextRun.attr("Name", Obj.TextRuns[i].Elements.NonSharedElements.UniqueName);

                        if (flag) {
                            var TextRunStyle = "";
                            TextRunStyle += me._getMeasurements(me._getMeasurmentsObj(Obj.TextRuns[i], i));
                            TextRunStyle += me._getElementsStyle(RIContext.RS, Obj.TextRuns[i].Elements);
                            $TextRun.attr("Style", TextRunStyle);
                        }

                        $ParagraphItem.append($TextRun);
                    }
            
                    if (Paragraphs[Index + 1])
                        me._writeRichTextItem(RIContext, Paragraphs, Index + 1, Obj.Paragraph.NonSharedElements.UniqueName, $ParagraphItem);

                    $ParagraphList.append($ParagraphItem);
                    ParentContainer.append($ParagraphList);
                }
            }); 
        },
        _getImageURL: function (RS, ImageName) {
            var me = this;

            var Url = me.options.reportViewer.options.reportViewerAPI + "/GetImage/?";
            Url += "ReportServerURL=" + me.options.reportViewer.options.reportServerURL;
            Url += "&SessionID=" + me.options.reportViewer.sessionID;
            Url += "&ImageID=" + ImageName;
            return Url;
        },
        _writeImage: function (RIContext) {
            var NewImage = new Image();
            var me = this;

            var Style = RIContext.Style + "display:block;max-height:100%;max-width:100%;" + me._getElementsStyle(RIContext.RS, RIContext.CurrObj.Elements);
            Style += me._getMeasurements(me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex), true);
            Style += "overflow:hidden;";

            var ImageName;
            var sizingType = RIContext.CurrObj.Elements.SharedElements.Sizing;

            if (RIContext.CurrObj.Type === "Image")
                ImageName = RIContext.CurrObj.Elements.NonSharedElements.ImageDataProperties.ImageName;
            else
                ImageName = RIContext.CurrObj.Elements.NonSharedElements.StreamName;
                        
            if (RIContext.CurrObj.Elements.NonSharedElements.ActionImageMapAreas) {
                NewImage.useMap = "#Map_" + RIContext.RS.sessionID + "_" + RIContext.CurrObj.Elements.NonSharedElements.UniqueName;
            }
            NewImage.onload = function () {
                me._writeActionImageMapAreas(RIContext, $(NewImage).width(), $(NewImage).height());
                var naturalSize = me._getNatural(this);
                
                me._resizeImage(this, sizingType, naturalSize.height, naturalSize.width, RIContext.CurrLocation.Height, RIContext.CurrLocation.Width);
            };
            NewImage.alt = forerunner.ssr.constants.messages.imageNotDisplay;
            $(NewImage).attr("style", "display:block;" );

            NewImage.src = this._getImageURL(RIContext.RS, ImageName);

            this._writeActions(RIContext, RIContext.CurrObj.Elements.NonSharedElements, $(NewImage));
            this._writeBookMark(RIContext);
  
            RIContext.$HTMLParent.attr("style", Style);
            RIContext.$HTMLParent.append(NewImage);
            return RIContext.$HTMLParent;
        },
        _writeActions: function (RIContext, Elements, $Control) {
            if (Elements.ActionInfo)
                for (var i = 0; i < Elements.ActionInfo.Count; i++) {
                    this._writeAction(RIContext, Elements.ActionInfo.Actions[i], $Control);
                }
        },
        _writeAction: function (RIContext, Action, Control) {
            var me = this;
            if (Action.HyperLink) {
                Control.attr("href", Action.HyperLink);
            }
            else if (Action.BookmarkLink) {
                //HRef needed for ImageMap, Class needed for non image map
                Control.attr("href", "#");
                Control.addClass("fr-report-cursor-pointer");
                Control.on("click", {BookmarkID: Action.BookmarkLink }, function (e) {
                    me._stopDefaultEvent(e);
                    me.options.reportViewer.navigateBookmark(e.data.BookmarkID);
                });
            }
            else {
                //HRef needed for ImageMap, Class needed for non image map
                Control.addClass("fr-report-cursor-pointer");
                Control.attr("href", "#");
                Control.on("click", { DrillthroughId: Action.DrillthroughId }, function (e) {
                    me._stopDefaultEvent(e);
                    me.options.reportViewer.navigateDrillthrough(e.data.DrillthroughId);
                });
            }
        },
        _writeActionImageMapAreas: function (RIContext, width, height) {
            var actionImageMapAreas = RIContext.CurrObj.Elements.NonSharedElements.ActionImageMapAreas;
            var me = me;

            if (actionImageMapAreas) {
                var $map = $("<MAP/>");
                $map.attr("name", "Map_" + RIContext.RS.sessionID + "_" + RIContext.CurrObj.Elements.NonSharedElements.UniqueName);
                $map.attr("id", "Map_" + RIContext.RS.sessionID + "_" + RIContext.CurrObj.Elements.NonSharedElements.UniqueName);

                for (var i = 0; i < actionImageMapAreas.Count; i++) {
                    var element = actionImageMapAreas.ActionInfoWithMaps[i];

                    for (var j = 0; j < element.ImageMapAreas.Count; j++) {
                        var $area = $("<AREA />");
                        $area.attr("tabindex", i + 1);
                        $area.attr("style", "text-decoration:none");
                        $area.attr("alt", element.ImageMapAreas.ImageMapArea[j].Tooltip);
                        if (element.Actions) {
                            this._writeAction(RIContext, element.Actions[0], $area);
                        }

                        var shape;
                        var coords = "";
                        switch (element.ImageMapAreas.ImageMapArea[j].ShapeType) {
                            case 0:
                                shape = "rect";
                                coords = parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[0] * width / 100, 10) + "," +
                                            parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[1] * height / 100, 10) + "," +
                                            parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[2] * width / 100, 10) + "," +
                                            parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[3] * height / 100, 10);
                                break;
                            case 1:
                                shape = "poly";
                                var coorCount = element.ImageMapAreas.ImageMapArea[j].CoorCount;
                                for (var k = 0; k < coorCount; k++) {
                                    if (k % 2 === 0) {
                                        coords += parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[k] * width / 100, 10);
                                    }
                                    else {
                                        coords += parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[k] * height / 100, 10);
                                    }
                                    if (k < coorCount - 1) {
                                        coords += ",";
                                    }
                                }
                                break;
                            case 2:
                                shape = "circ";
                                coords = parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[0] * width / 100, 10) + "," +
                                    parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[1] * height / 100, 10) + "," +
                                    parseInt(element.ImageMapAreas.ImageMapArea[j].Coordinates[2] * width / 100, 10);
                                break;
                        }
                        $area.attr("shape", shape);
                        $area.attr("coords", coords);
                        $map.append($area);
                    }
                }
                RIContext.$HTMLParent.append($map);
            }
        },
        _resizeImage: function (img, sizingType, height, width, maxHeight, maxWidth) {
            var ratio = 0;
            var me = this;

            height = me._convertToMM(height + "px");
            width = me._convertToMM(width + "px");
            if (height !== 0 && width !== 0) {
                switch (sizingType) {
                    case 0://AutoSize
                        $(img).css("height", height + "mm");
                        $(img).css("width", width + "mm");
                        break;
                    case 1://Fit
                        $(img).css("height", maxHeight + "mm");
                        $(img).css("width", maxWidth + "mm");
                        break;
                    case 2://Fit Proportional
                        if (height / maxHeight > 1 || width / maxWidth > 1) {
                            if ((height / maxHeight) >= (width / maxWidth)) {
                                ratio = maxHeight / height;

                                $(img).css("height", maxHeight + "mm");
                                $(img).css("width", width * ratio + "mm");
                                $(img).css("max-height", maxHeight + "mm");
                                $(img).css("max-width", width * ratio + "mm");
                                $(img).css("min-height", maxHeight + "mm");
                                $(img).css("min-width", width * ratio + "mm");
                            }
                            else {
                                ratio = maxWidth / width;

                                $(img).css("width", maxWidth + "mm");
                                $(img).css("height", height * ratio + "mm");
                                $(img).css("max-width", maxWidth + "mm");
                                $(img).css("max-height", height * ratio + "mm");
                                $(img).css("min-width", maxWidth + "mm");
                                $(img).css("min-height", height * ratio + "mm");
                            }
                        }
                        break;
                    case 3://Clip
                        var naturalSize = me._getNatural(img);
                        $(img).css("height", me._convertToMM(naturalSize.height + "px") + "mm");
                        $(img).css("width", me._convertToMM(naturalSize.width + "px") + "mm");
                        $(img).css("max-height", me._convertToMM(naturalSize.height + "px") + "mm");
                        $(img).css("max-width", me._convertToMM(naturalSize.width + "px") + "mm");
                        //Also add style overflow:hidden to it's parent container
                        break;
                    default:
                        break;
                }
            }
        },
        _writeBookMark: function (RIContext) {
            var $node = $("<a/>");
            //var me = this;

            if (RIContext.CurrObj.Elements.SharedElements.Bookmark) {
                $node.attr("name", RIContext.CurrObj.Elements.SharedElements.Bookmark);
                $node.attr("id", RIContext.CurrObj.Elements.SharedElements.Bookmark);
            }
            else if (RIContext.CurrObj.Elements.NonSharedElements.Bookmark) {
                $node.attr("name", RIContext.CurrObj.Elements.NonSharedElements.Bookmark);
                $node.attr("id", RIContext.CurrObj.Elements.NonSharedElements.Bookmark);
            }
            if ($node.attr("id"))
                RIContext.$HTMLParent.append($node);
        },
        _writeTablixCell: function (RIContext, Obj, Index, BodyCellRowIndex) {
            var $Cell = new $("<TD/>");
            var Style = "";
            var width;
            var height;
            //var hbordersize = 0;
            //var wbordersize = 0;
            var me = this;
    
            Style = "vertical-align:top;padding:0;margin:0;-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;-ms-box-sizing: border-box;";
            Style += me._getFullBorderStyle(Obj.Cell.ReportItem);
            var ColIndex = Obj.ColumnIndex;

            var RowIndex;
            if (me.isNull(BodyCellRowIndex))
                RowIndex = Obj.RowIndex;
            else
                RowIndex = BodyCellRowIndex;

            width = RIContext.CurrObj.ColumnWidths.Columns[ColIndex].Width;
            height = RIContext.CurrObj.RowHeights.Rows[RowIndex].Height;
            Style += "overflow:hidden;width:" + width + "mm;" + "max-width:" + width + "mm;"  + "height:" + height + "mm;";

            //Row and column span
            if (Obj.RowSpan !== undefined)
                $Cell.attr("rowspan", Obj.RowSpan);
            if (Obj.ColSpan !== undefined)
                $Cell.attr("colspan", Obj.ColSpan);

            //Background color goes on the cell
            if ((Obj.Cell.ReportItem.Elements.SharedElements.Style) && Obj.Cell.ReportItem.Elements.SharedElements.Style.BackgroundColor)
                Style += "background-color:" + Obj.Cell.ReportItem.Elements.SharedElements.Style.BackgroundColor + ";";
            else if (Obj.Cell.ReportItem.Elements.NonSharedElements.Style && Obj.Cell.ReportItem.Elements.NonSharedElements.Style.BackgroundColor)
                Style += "background-color:" + Obj.Cell.ReportItem.Elements.NonSharedElements.Style.BackgroundColor + ";";

            $Cell.attr("Style", Style);
            $Cell.append(me._writeReportItems(new reportItemContext(RIContext.RS, Obj.Cell.ReportItem, Index, RIContext.CurrObj, new $("<Div/>"), "margin:0;overflow:hidden;width:100%;height:100%;", new tempMeasurement(height, width))));
            return $Cell;
        },
        _writeTablix: function (RIContext) {
            var me = this;
            var $Tablix = me._getDefaultHTMLTable();
            var Style = "border-collapse:collapse;padding:0;margin:0;";
            var $Row;
            var LastRowIndex = 0;
            var $FixedColHeader = new $("<DIV/>").css({ display: "table", position: "absolute", top: "0px", left: "0px",padding: "0",margin:"0", "border-collapse": "collapse"});
            var $FixedRowHeader = new $("<TABLE/>").css({ position: "absolute", top: "0px", left: "0px", padding: "0", margin: "0", "border-collapse": "collapse" });
            $FixedRowHeader.attr("CELLSPACING", 0);
            $FixedRowHeader.attr("CELLPADDING", 0);
            var LastObjType = "";
            var HasFixedRows = false;
            var HasFixedCols = false;
            

            Style += me._getMeasurements(me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex));
            Style += me._getElementsStyle(RIContext.RS, RIContext.CurrObj.Elements);
            $Tablix.attr("Style", Style);
    
            $Row = new $("<TR/>");
            $.each(RIContext.CurrObj.TablixRows, function (Index, Obj) {


                if (Obj.RowIndex !== LastRowIndex) {
                    $Tablix.append($Row);

                    //Handle fixed col header
                    if (RIContext.CurrObj.RowHeights.Rows[Obj.RowIndex - 1].FixRows === 1)
                        $FixedColHeader.append($Row.clone(true, true));

                    $Row = new $("<TR/>");
                    LastRowIndex = Obj.RowIndex;
                }

                //Handle fixed row header
                if (Obj.Type !== "Corner" && LastObjType === "Corner") {
                    $FixedRowHeader.append($Row.clone(true, true));
                }
                if (Obj.Type !== "RowHeader" && LastObjType === "RowHeader") {
                    $FixedRowHeader.append($Row.clone(true, true));
                }
                if (RIContext.CurrObj.RowHeights.Rows[Obj.RowIndex].FixRows === 1)
                    HasFixedRows = true;
                if (Obj.Type !== "BodyRow" && RIContext.CurrObj.ColumnWidths.Columns[Obj.ColumnIndex].FixColumn === 1)
                    HasFixedCols = true;

                if (Obj.Type === "BodyRow") {
                    $.each(Obj.Cells, function (BRIndex, BRObj) {
                        $Row.append(me._writeTablixCell(RIContext, BRObj, BRIndex, Obj.RowIndex));
                    });
                }
                else {
                    if (Obj.Cell) $Row.append(me._writeTablixCell(RIContext, Obj, Index));
                }
                LastObjType = Obj.Type;
            });
            $Tablix.append($Row);

            if (HasFixedRows) {
                $FixedColHeader.hide();
                // $Tablix.append($FixedColHeader);
            }
            else
                $FixedColHeader = null;

            if (HasFixedCols) {
                $FixedRowHeader.hide();
                //$Tablix.append($FixedRowHeader);
            }
            else
                $FixedRowHeader = null;

            var ret = $("<div style='position:relative'></div");
            ret.append($FixedColHeader);
            ret.append($FixedRowHeader);
            ret.append($Tablix);
            RIContext.RS.floatingHeaders.push(new floatingHeader(ret, $FixedColHeader, $FixedRowHeader));
            return ret;
        },
        _writeSubreport: function (RIContext) {
            var me = this;
            RIContext.Style += me._getElementsStyle(RIContext.RS, RIContext.CurrObj.SubReportProperties);
            RIContext.CurrObj = RIContext.CurrObj.BodyElements;
            return me._writeRectangle(RIContext);
    
        },
        _writeLine: function (RIContext) {
            var me = this;
            var measurement = me._getMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex);
            var Style = "position:relative;width:" + measurement.Width + "mm;height:" + measurement.Height + "mm;";
            
            if (measurement.Width === 0 || measurement.Height === 0)
                Style += me._getFullBorderStyle(RIContext.CurrObj);
            else {
                var $line = $("<Div/>");
                var newWidth = Math.sqrt(Math.pow(measurement.Height, 2) + Math.pow(measurement.Width, 2));
                var rotate = Math.atan(measurement.Height / measurement.Width);
                var newTop = (newWidth / 2) * Math.sin(rotate);
                var newLeft = (newWidth / 2) - Math.sqrt(Math.pow(newWidth / 2, 2) + Math.pow(newTop, 2));
                if (!(RIContext.CurrObj.Elements.SharedElements.Slant === undefined || RIContext.CurrObj.Elements.SharedElements.Slant === 0))
                    rotate = rotate - (2 * rotate);

                var lineStyle = "position:absolute;top:" + newTop + "mm;left:" + newLeft + "mm;";
                lineStyle += me._getFullBorderStyle(RIContext.CurrObj);
                lineStyle += "width:" + newWidth + "mm;height:0;";
                lineStyle += "-moz-transform: rotate(" + rotate + "rad);";
                lineStyle += "-webkit-transform: rotate(" + rotate + "rad);";
                lineStyle += "-ms-transform: rotate(" + rotate + "rad);";
                lineStyle += "transform: rotate(" + rotate + "rad);";
                $line.attr("Style", lineStyle);

                RIContext.$HTMLParent.append($line);
            }

            

            me._writeBookMark(RIContext);

            RIContext.$HTMLParent.attr("Style", Style + RIContext.Style);
            return RIContext.$HTMLParent;

        },
        _writeExportPanel: function () {
            var me = this;
            var $ExportPanel = $("<div class='fr-render-export-panel'></div>");
            var exportType = forerunner.ssr.constants.exportType;

            var ExportList = [];
            ExportList.push({ Name: exportType.xml, Type: "XML" });
            ExportList.push({ Name: exportType.csv, Type: "CSV" });
            ExportList.push({ Name: exportType.pdf, Type: "PDF" });
            ExportList.push({ Name: exportType.mhtml, Type: "MHTML" });
            ExportList.push({ Name: exportType.excel, Type: "EXCELOPENXML" });
            ExportList.push({ Name: exportType.tiff, Type: "IMAGE" });
            ExportList.push({ Name: exportType.word, Type: "WORDOPENXML" });

            $.each(ExportList, function (Index, ExportObj) {
                $ExportPanel.append(me._getExportItem(ExportObj));
            });

            $(document).on("click", function (e) {
                if (!$(e.target).hasClass("fr-render-export-panel") && !$(e.target).hasClass("fr-button-export") && $ExportPanel.is(":visible")) {
                    $ExportPanel.toggle();
                }
            });

            $(".fr-button-export").filter(":visible").append($ExportPanel);
        },
        _getExportItem: function (ExportObj) {
            var me = this;
            var $ExportItem = $("<div class='fr-render-export-item'></div>");

            $ExportItem.hover(function () {
                $ExportItem.addClass("fr-render-export-hover");
            },
            function () {
                $ExportItem.removeClass("fr-render-export-hover");
            });

            var $ExportLink = $("<a class='fr-render-export-link' value='" + ExportObj.Type + "' href='javascript:void(0)'>" + ExportObj.Name + "</a>");
            $ExportLink.on("click", function () {
                me.options.reportViewer.exportReport(ExportObj.Type);
            });

            $ExportItem.append($ExportLink);
            return $ExportItem;
        },
        

        //Helper fucntions
        _getHeight: function ($obj) {
            var me = this;
            var height;

            var $copiedElem = $obj.clone()
                                .css({
                                    visibility: "hidden"
                                });

            $copiedElem.find("img").remove();

            $("body").append($copiedElem);
            height = $copiedElem.height() + "px";

            $copiedElem.remove();

            //Return in mm
            return me._convertToMM(height);

        },
        _getElementsStyle: function (RS, CurrObj) {
            var Style = "";
            var me = this;

            Style += me._getStyle(RS, CurrObj.SharedElements.Style, CurrObj.NonSharedElements);
            Style += me._getStyle(RS, CurrObj.NonSharedElements.Style, CurrObj.NonSharedElements);
            return Style;
        },
        _getElementsTextStyle: function (CurrObj) {
            var Style = "";
            var me = this;

            Style += me._getTextStyle(CurrObj.SharedElements.Style, CurrObj.NonSharedElements);
            Style += me._getTextStyle(CurrObj.NonSharedElements.Style, CurrObj.NonSharedElements);
            return Style;
        },
        _getElementsNonTextStyle: function (RS, CurrObj) {
            var Style = "";
            var me = this;

            Style += me._getNonTextStyle(RS, CurrObj.SharedElements.Style, CurrObj.NonSharedElements);
            Style += me._getNonTextStyle(RS, CurrObj.NonSharedElements.Style, CurrObj.NonSharedElements);
            return Style;
        },
        _getBorderSize: function (CurrObj, Side) {
            var me = this;
            var Obj;
            var DefaultStyle;
            var SideStyle;
            var DefaultSize;
            var SideSize;

            //Need left, top, right bottom border
            Obj = CurrObj.Elements.SharedElements.Style;
            if (Obj) {
                DefaultStyle = Obj.BorderStyle;
                SideStyle = Obj["BorderStyle" + Side];
                DefaultSize = Obj.BorderWidth;
                SideSize = Obj["BorderWidth" + Side];
            }
            else {
                Obj = CurrObj.Elements.NonSharedElements.Style;
                if (Obj) {
                    DefaultStyle = Obj.BorderStyle;
                    SideStyle = Obj["BorderStyle" + Side];
                    DefaultSize = Obj.BorderWidth;
                    SideSize = Obj["BorderWidth" + Side];
                }
            }
    
            if (!SideStyle && DefaultStyle === 0)
                return 0;
            if (SideStyle === 0)
                return 0;
            if (!SideSize)
                return me._convertToMM(DefaultSize);
            else
                return me._convertToMM(SideSize);
        },
        _getPaddingSize: function (CurrObj, Side) {
            var me = this;
            var Obj;
            var SideSize;

    
            Obj = CurrObj.Elements.SharedElements.Style;
            if (Obj) {
                SideSize = Obj["Padding" + Side];
            }
            else {
                Obj = CurrObj.Elements.NonSharedElements.Style;
                if (Obj) {
                    SideSize = Obj["Padding" + Side];
                }
            }
            return me._convertToMM(SideSize);
        },
        _getFullBorderStyle: function (CurrObj) {
            var me = this;
            var Style = "";
            var Obj;

            if (!CurrObj.Elements)
                return "";

            //Need left, top, right bottom border
            Obj = CurrObj.Elements.SharedElements.Style;
            if (Obj !== undefined) {
                if (Obj.BorderStyle !== undefined)
                    Style += "border:" + Obj.BorderWidth + " " + me._getBorderStyle(Obj.BorderStyle) + " " + Obj.BorderColor + ";";
                if (Obj.BorderStyleLeft !== undefined || Obj.BorderWidthLeft !== undefined || Obj.BorderColorLeft !== undefined)
                    Style += "border-left:" + ((Obj.BorderWidthLeft === undefined) ? Obj.BorderWidth : Obj.BorderWidthLeft) + " " + ((Obj.BorderStyleLeft === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleLeft)) + " " + ((Obj.BorderColorLeft === undefined) ? Obj.BorderColor : Obj.BorderColorLeft) + ";";
                if (Obj.BorderStyleRight !== undefined || Obj.BorderWidthRight !== undefined || Obj.BorderColorRight !== undefined)
                    Style += "border-right:" + ((Obj.BorderWidthRight === undefined) ? Obj.BorderWidth : Obj.BorderWidthRight) + " " + ((Obj.BorderStyleRight === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleRight)) + " " + ((Obj.BorderColorRight === undefined) ? Obj.BorderColr : Obj.BorderColorRight) + ";";
                if (Obj.BorderStyleTop !== undefined || Obj.BorderWidthTop !== undefined || Obj.BorderColorTop !== undefined)
                    Style += "border-top:" + ((Obj.BorderWidthTop === undefined) ? Obj.BorderWidth : Obj.BorderWidthTop) + " " + ((Obj.BorderStyleTop === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleTop)) + " " + ((Obj.BorderColorTop === undefined) ? Obj.BorderColor : Obj.BorderColorTop) + ";";
                if (Obj.BorderStyleBottom !== undefined || Obj.BorderWidthBottom !== undefined || Obj.BorderColorBottom !== undefined)
                    Style += "border-bottom:" + ((Obj.BorderWidthBottom === undefined) ? Obj.BorderWidth : Obj.BorderWidthBottom) + " " + ((Obj.BorderStyleBottom === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleBottom)) + " " + ((Obj.BorderColorBottom === undefined) ? Obj.BorderColor : Obj.BorderColorBottom) + ";";
            }
            Obj = CurrObj.Elements.NonSharedElements.Style;
            if (Obj !== undefined) {
                if (Obj.BorderStyle !== undefined)
                    Style += "border:" + Obj.BorderWidth + " " + me._getBorderStyle(Obj.BorderStyle) + " " + Obj.BorderColor + ";";
                if (Obj.BorderStyleLeft !== undefined || Obj.BorderWidthLeft !== undefined || Obj.BorderColorLeft !== undefined)
                    Style += "border-left:" + ((Obj.BorderWidthLeft === undefined) ? Obj.BorderWidth : Obj.BorderWidthLeft) + " " + ((Obj.BorderStyleLeft === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleLeft)) + " " + ((Obj.BorderColorLeft === undefined) ? Obj.BorderColor : Obj.BorderColorLeft) + ";";
                if (Obj.BorderStyleRight !== undefined || Obj.BorderWidthRight !== undefined || Obj.BorderColorRight !== undefined)
                    Style += "border-right:" + ((Obj.BorderWidthRight === undefined) ? Obj.BorderWidth : Obj.BorderWidthRight) + " " + ((Obj.BorderStyleRight === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleRight)) + " " + ((Obj.BorderColorRight === undefined) ? Obj.BorderColr : Obj.BorderColorRight) + ";";
                if (Obj.BorderStyleTop !== undefined || Obj.BorderWidthTop !== undefined || Obj.BorderColorTop !== undefined)
                    Style += "border-top:" + ((Obj.BorderWidthTop === undefined) ? Obj.BorderWidth : Obj.BorderWidthTop) + " " + ((Obj.BorderStyleTop === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleTop)) + " " + ((Obj.BorderColorTop === undefined) ? Obj.BorderColor : Obj.BorderColorTop) + ";";
                if (Obj.BorderStyleBottom !== undefined || Obj.BorderWidthBottom !== undefined || Obj.BorderColorBottom !== undefined)
                    Style += "border-bottom:" + ((Obj.BorderWidthBottom === undefined) ? Obj.BorderWidth : Obj.BorderWidthBottom) + " " + ((Obj.BorderStyleBottom === undefined) ? me._getBorderStyle(Obj.BorderStyle) : me._getBorderStyle(Obj.BorderStyleBottom)) + " " + ((Obj.BorderColorBottom === undefined) ? Obj.BorderColor : Obj.BorderColorBottom) + ";";
            }

            return Style;
        },
        _getMeasurements: function (CurrObj, includeHeight) {
            var me = this;
            var Style = "";
            //TODO:  zIndex

            if (!CurrObj)
                return "";

            //Top and left are set in set location, height is not set becasue differnt browsers measure and break words differently
            if (CurrObj.Width !== undefined) {
                Style += "width:" + CurrObj.Width + "mm;";
                Style += "min-width:" + CurrObj.Width + "mm;";
                Style += "max-width:" + (CurrObj.Width) + "mm;";
            }

            if (includeHeight && CurrObj.Height !== undefined){
                Style += "height:" + CurrObj.Height + "mm;";
                Style += "min-height:" + CurrObj.Height + "mm;";
                Style += "max-height:" + (CurrObj.Height) + "mm;";
            }

            return Style;
        },
        _getStyle: function (RS, CurrObj, TypeCodeObj) {
            var me = this;
            var Style = "";

            if (!CurrObj)
                return Style;

            Style += me._getNonTextStyle(RS, CurrObj, TypeCodeObj);
            Style += me._getTextStyle(CurrObj, TypeCodeObj);

            return Style;
        },
        _backgroundRepeatTypesMap: function () {
            return {
                0: "repeat",    // Repeat
                1: "no-repeat", // Clip
                2: "repeat-x",  // RepeatX
                3: "repeat-y"   // RepeatY
            };
        },
        _getImageStyleURL: function (RS, ImageName) {
            var me = this;
            return "url(" + me._getImageURL(RS, ImageName) + ")";
        },
        _getNonTextStyle: function (RS, CurrObj, TypeCodeObj) {
            var me = this;
            var Style = "";

            if (!CurrObj)
                return Style;

            if (CurrObj.BackgroundColor)
                Style += "background-color:" + CurrObj.BackgroundColor + ";";
            if (CurrObj.BackgroundImage)
                Style += "background-image:" + me._getImageStyleURL(RS, CurrObj.BackgroundImage.ImageName) + ";";
            if (CurrObj.BackgroundRepeat !== undefined && me._backgroundRepeatTypesMap()[CurrObj.BackgroundRepeat])
                Style += "background-repeat:" + me._backgroundRepeatTypesMap()[CurrObj.BackgroundRepeat] + ";";

            return Style;
        },
        _getTextStyle: function (CurrObj, TypeCodeObj) {
            var me = this;
            var Style = "";

            if (!CurrObj)
                return Style;

            if (CurrObj.PaddingBottom !== undefined)
                Style += "padding-bottom:" + CurrObj.PaddingBottom + ";";
            if (CurrObj.PaddingLeft !== undefined)
                Style += "padding-left:" + CurrObj.PaddingLeft + ";";
            if (CurrObj.PaddingRight !== undefined)
                Style += "padding-right:" + CurrObj.PaddingRight + ";";
            if (CurrObj.PaddingTop !== undefined)
                Style += "padding-top:" + CurrObj.PaddingTop + ";";
            if (CurrObj.UnicodeBiDi !== undefined)
                Style += "unicode-bidi:" + me._getBiDi(CurrObj.UnicodeBiDi) + ";";
            if (CurrObj.VerticalAlign !== undefined)
                Style += "vertical-align:" + me._getVAligh(CurrObj.VerticalAlign) + ";";
            if (CurrObj.WritingMode !== undefined)
                Style += "layout-flow:" + me._getLayoutFlow(CurrObj.WritingMode) + ";";
            if (CurrObj.Direction !== undefined)
                Style += "Direction:" + me._getDirection(CurrObj.Direction) + ";";

            if (CurrObj.TextAlign !== undefined)
                Style += "text-align:" + me._getTextAlign(CurrObj.TextAlign, TypeCodeObj) + ";";
            if (CurrObj.FontStyle !== undefined)
                Style += "font-style:" + me._getFontStyle(CurrObj.FontStyle) + ";";
            if (CurrObj.FontWeight !== undefined)
                Style += "font-weight:" + me._getFontWeight(CurrObj.FontWeight) + ";";
            if (CurrObj.FontFamily !== undefined)
                Style += "font-family:" + CurrObj.FontFamily + ";";
            if (CurrObj.FontSize !== undefined)
                Style += "font-size:" + CurrObj.FontSize + ";";
            if (CurrObj.TextDecoration !== undefined)
                Style += "text-decoration:" + me._getTextDecoration(CurrObj.TextDecoration) + ";";
            if (CurrObj.Color !== undefined)
                Style += "color:" + CurrObj.Color + ";";
            //   if (CurrObj.Calendar !== undefined)
            //       Style += "calendar:" + GetCalendar(CurrObj.Calendar) + ";";
            //writing-mode:lr-tb;?
            return Style;

        },
        _getCalendar: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "Gregorian";
                case 1:
                    return "GregorianArabic";
                case 2:
                    return "GregorianMiddleEastFrench";
                case 3:
                    return "GregorianTransliteratedEnglish";
                case 4:
                    return "GregorianTransliteratedFrench";
                case 5:
                    return "GregorianUSEnglish";
                case 6:
                    return "Hebrew";
                case 7:
                    return "Hijri";
                case 9:
                    return "Korean";
                case 10:
                    return "Julian";
                case 11:
                    return "Taiwan";
                case 12:
                    return "ThaiBuddist";
            }
            return "Gregorian";
        },
        _getTextDecoration: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "None";
                case 1:
                    return "Underline";
                case 2:
                    return "Overline";
                case 3:
                    return "LineThrough";
            }
            return "None";
        },
        _getFontWeight: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "Normal";
                case 1:
                    return "Thin";
                case 2:
                    return "ExtraLight";
                case 3:
                    return "Light";
                case 4:
                    return "Medium";
                case 5:
                    return "SemiBold";
                case 6:
                    return "Bold";
                case 7:
                    return "ExtraBold";
                case 8:
                    return "Heavy";
            }
            return "General";
        },
        _getFontStyle: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "Normal";
                case 1:
                    return "Italic";
            }
            return "Normal";
        },
        _getTextAlign: function (RPLCode, TypeCodeObj) {
            switch (RPLCode) {
                case 0:
                    //Default is string, need to handle direction, 15 seems to be decimal not datetime
                    if (TypeCodeObj.TypeCode === undefined)
                        return "Left";
                    switch (TypeCodeObj.TypeCode) {
                        case 3:
                        case 6:
                        case 7:
                        case 9:
                        case 11:
                        case 12:
                        case 13:
                        case 14:
                        case 15:
                        case 16:
                            return "Right";
                        case 4:
                        case 17:
                        case 18:
                            return "Left";
                        default:
                            return "Left";
                    }

                    break;
                case 1:
                    return "Left";
                case 2:
                    return "Center";
                case 3:
                    return "Right";
            }

        },
        _getDirection: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "LTR";
                case 1:
                    return "RTL";

            }
            return "LTR";
        },
        _getLayoutFlow: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "Horizontal";
                case 1:
                    return "Vertical";
                case 2:
                    return "Rotate270";
            }
            return "Horizontal";
        },
        _getVAligh: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "Top";
                case 1:
                    return "Middle";
                case 2:
                    return "Bottom";
            }
            return "Top";
        },
        _getBiDi: function (RPLCode) {
            switch (RPLCode) {
                case 0:
                    return "normal";
                case 1:
                    return "embed";
                case 2:
                    return "BiDiOverride";
            }
            return "normal";
        },
        _getDefaultHTMLTable: function () {
            var $newObj = $("<Table/>");

            $newObj.attr("CELLSPACING", 0);
            $newObj.attr("CELLPADDING", 0);
            return $newObj;
        },
        _getBorderStyle: function (RPLStyle) {
            switch (RPLStyle) {
                case 0:
                    return "None";
                case 1:
                    return "Dotted";
                case 2:
                    return "Dashed";
                case 3:
                    return "Solid";
                case 4:
                    return "Double";
            }
            return "None";
        },
        _getMeasurmentsObj: function (CurrObj, Index) {
            var retval = null;

            if (CurrObj.Measurement)
                retval = CurrObj.Measurement.Measurements[Index];
            return retval;
        },
        _convertToMM: function (convertFrom) {
    
            if (!convertFrom)
                return 0;
    
            var unit = convertFrom.match(/\D+$/);  // get the existing unit
            var value = convertFrom.match(/\d+/);  // get the numeric component

            if (unit.length === 1) unit = unit[0];
            if (value.length === 1) value = value[0];

            switch (unit) {
                case "px":
                    return value / 3.78;
                case "pt":
                    return value * 0.352777777778;
                case "in":
                    return value * 25.4;
                case "mm":
                    return value;
                case "cm":
                    return value * 10;
                case "em":
                    return value * 4.2175176;
            }

            //This is an error
            return value;
        },
        _getListStyle: function (Style, Level) {
            var ListStyle;
            //Numbered
            if (Style === 1) {
                switch (Level % 3) {
                    case 1:
                        ListStyle = "decimal";
                        break;
                    case 2:
                        ListStyle = "lower-roman";
                        break;
                    case 0:
                        ListStyle = "lower-latin";
                        break;
                }
            }
                //Bulleted
            else if (Style === 2) {
                switch (Level % 3) {
                    case 0:
                        ListStyle = "square";
                        break;
                    case 1:
                        ListStyle = "disc";
                        break;
                    case 2:
                        ListStyle = "circle";
                        break;
                }
            }
            return ListStyle;
        },
        _stopDefaultEvent: function (e) {
            //IE
            if (window.ActiveXObject)
                window.event.returnValue = false;
            else {
                e.preventDefault();
                e.stopPropagation();
            }
        },
        _getNatural: function (domElement) {
            if (domElement.naturalWidth !== undefined && domElement.naturalHeight !== undefined) {
                return { width: domElement.naturalWidth, height: domElement.naturalHeight };
            }
            else {
                var img = new Image();
                img.src = domElement.src;
                return { width: img.width, height: img.height };
            }
        },
        isNull: function (val) {
            if (val === null || val === undefined)
                return true;
            else
                return false;
        },
    });  // $.widget
});