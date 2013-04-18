﻿
//Global reference to all reports
var Reports = new Object();


function ReportItemContext(RS,CurrObj, CurrObjIndex, CurrObjParent, $HTMLParent, Style) {
    this.RS = RS;
    this.CurrObj = CurrObj;
    this.CurrObjIndex = CurrObjIndex;
    this.CurrObjParent = CurrObjParent;
    this.$HTMLParent = $HTMLParent;
    this.Style = Style;
}
function ReportState(UID, $ReportOuterDiv,  ReportServer, ReportPath, Toolbar, $PageContainer) {
    this.UID = UID;
    this.$ReportOuterDiv = $ReportOuterDiv;       
    this.CurPage = 0;
    this.Pages = new Object();
    this.$PageInput = new $("<Input/>");
    this.ReportServerURL = ReportServer;
    this.ReportPath = ReportPath;
    this.Toolbar = Toolbar;
    this.SessionID = "";
    this.$PageContainer = $PageContainer;

}
function ReportPage($Container, ReportObj) {
    this.ReportObj = ReportObj;    
    this.$Container = $Container;
    this.Image = null;
}


function InitReport(ReportServer, ReportPath, Toolbar, PageNum, UID) {
    var $Container = $("<Table/>");    
    var $Row =  new $("<TR/>");
    var $Cell;
    
    var RS = new ReportState(UID, $("#" + UID), ReportServer, ReportPath, Toolbar, $Row);
    
    Reports[UID] = RS;
    
    if (Toolbar) {
        $Row = new $("<TR/>");
        $Cell = new $("<TD/>");
        $Cell.append(GetToolbar(UID));
        $Row.append($Cell);
        $Container.append($Row);
    }

  
    //Log in screen if needed

    //If Parameters needed show Parameters


    //load the report Page requested        
    $Container.append(RS.$PageContainer);
    RS.$ReportOuterDiv.append($Container);
    LoadPage(RS, PageNum,null);    
}

function SetActionCursor(Ob) {
    Ob.style.cursor = "pointer";   
}
function ShowLoadingImage() {


}

function LoadPage(RS, NewPageNum,Page) {

    if (Page != null)
        if (Page.$Container != null)
            Page.$Container.fadeOut("fast");

    if (RS.Pages[NewPageNum] !=null)
        if (RS.Pages[NewPageNum].$Container != null) {
            SetPage(RS, NewPageNum);
            return;
        }
        
    $.getJSON("/api/Report/GetJSON/", {
        ReportServerURL: RS.ReportServerURL,
        ReportPath: RS.ReportPath,
        SessionID: RS.SessionID,
        PageNumber: NewPageNum
    })
    .done(function (Data) { WritePage(Data, RS, NewPageNum, Page); })
    .fail(function () { console.log("error"); })

}
function SetPage(RS,NewPageNum,OldPage) {    
    RS.$PageContainer.append(RS.Pages[NewPageNum].$Container)
    RS.Pages[NewPageNum].$Container.fadeIn("normal");
    if (OldPage != null)
        OldPage.$Container.detach();
    RS.CurPage = NewPageNum;
    RS.$PageInput.val(NewPageNum);
}
function RefreshReport(RS) {
    Page = RS.Pages[RS.CurPage];
     
    RS.SessionID = "";
    RS.Pages = new Object();
    LoadPage(RS, 1,Page);
}
function GetToolbar(UID) {
    var $Toolbar = $("<Table/>");
    var $Row = $("<TR/>");
    var $Cell;

    $Toolbar.attr("style", "width:100%;background-color:lightsteelblue;background:linear-gradient(steelblue lightsteelblue);");

    $Cell = new $("<TD/>");
    $Cell.attr("style", "width:10mm;");
    $Cell.attr("onclick", "ShowParms(Reports['" + UID + "'])");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Par");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:10mm;");
    $Cell.attr("onclick", "ShowNav('" + UID + "')");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Nav");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:20mm;");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:10mm;");
    $Cell.attr("onclick", "RefreshReport(Reports['" + UID + "'])");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Refresh");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:20mm;");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:10mm;");
    $Cell.attr("onclick", "NavToPage(Reports['" + UID + "'],1)");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Start");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:10mm;");

    $Cell.attr("onclick", "NavToPage(Reports['" + UID + "'],Reports['" + UID + "'].CurPage-1)");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Prev");
    $Row.append($Cell);

    $Cell = Reports[UID].$PageInput;
    $Cell.attr("style", "min-width:10mm;max-width:15mm;text-align:right;");
    $Cell.attr("id", "PageInput"); 
    $Cell.attr("type", "number")
    $Cell.bind("keypress", function (e) { if (e.keyCode == 13) NavToPage(Reports[UID],Reports[UID].$PageInput.val()); });
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "min-width:10mm;");
    $Cell.attr("onclick", "NavToPage(Reports['" + UID + "'],Reports['" + UID + "'].CurPage+1)");
    $Cell.attr("onmouseover", "SetActionCursor(this)");
    $Cell.html("Next");
    $Row.append($Cell);

    $Cell = new $("<TD/>");
    $Cell.attr("style", "width:100%;");       
    $Row.append($Cell);

    $Toolbar.append($Row);
    return $Toolbar;
}
function NavToPage(RS,NewPageNum) {

    //TODO:  Need to handle calling this before the last call finishes
    LoadPage(RS, NewPageNum,RS.Pages[RS.CurPage]);

}
function ShowParms() {
    alert("Show");
}

function ShowNav(UID) {



}


function WritePage(Data, RS, NewPageNum,Page) {
    var $Report = GetDefaultHTMLDiv();
    
    RS.Pages[NewPageNum] = new ReportPage($Report,Data);
    RS.SessionID =Data.SessionID;

    //Write Style   
    $Report.attr("Style", "" + GetStyle(Data.Report.PageContent.PageStyle));

    //Sections
    $.each(Data.Report.PageContent.Sections, function (Index, Obj) { WriteSection(new ReportItemContext(RS, Obj, Index, Data.Report.PageContent, $Report, "")); });

    SetPage(RS,NewPageNum,Page);
    
}
function WriteSection(RIContext) {
    var $NewObj = GetDefaultHTMLTable();
    var $Sec = $("<TR/>");

    $Sec.attr("Style", "" + GetMeasurements(GetMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex)));

    //Columns
    $NewObj.append($Sec);
    $.each(RIContext.CurrObj.Columns, function (Index, Obj) { WriteColumn(new ReportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, $Sec, null)); });
    RIContext.$HTMLParent.append($NewObj);   
}
function WriteColumn(RIContext) {
    var $Column = $("<TD/>");  //HTML Object for the report column
    var $RI;        //This is the ReportItem Object
    var $LocDiv;    //This DIV will have the top and left location set, location is not set anywhere else
    var Layout = new Object();  //This array holds the object that are before to determin location

    $Column.attr("Style", "" + GetElementsStyle(RIContext.CurrObj.Elements));
    $.each(RIContext.CurrObj.ReportItems, function (Index, Obj) {        
        $RI = WriteReportItems(new ReportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, new $("<Div/>"), ""));
        Layout[Index] = $RI;
        $LocDiv = SetLocation(new $("<Div/>"), RIContext.CurrObj.Measurement.Measurements,Layout, Index);
        $LocDiv.append($RI);
        $Column.append($LocDiv);
    });
    RIContext.$HTMLParent.append($Column);
}

function SetLocation($LocObj, Measurements,Layout, CurrObjIndex) {
    var NewTop = Measurements[CurrObjIndex].Top;

    //Need to use Layout to get real height and convert from px to mm
    for (var i = 0 ; i < CurrObjIndex; i++) {        
        //NewTop -= Layout[i].height();        
        NewTop -= Measurements[i].Height;
    }
    $LocObj.attr("Style", "position:relative;top:" + NewTop + "mm;left:" + Measurements[CurrObjIndex].Left + "mm;");
    return $LocObj;
}

function WriteReportItems(RIContext) {
    
    switch (RIContext.CurrObj.Type)
    {
        case "RichTextBox":
            return WriteRichText(RIContext);
            break;
        case "Image":
            return WriteImage(RIContext);
            break;
        case "Tablix":
            return WriteTablix(RIContext);
            break;
        case "Rectangle":
            return WriteRectangle(RIContext);
            break;
    }
}
function WriteRichText(RIContext) {
    var Style = "";
    var $NewObj = RIContext.$HTMLParent;

    if (RIContext.CurrObj.Elements.SharedElements.Value != null)
        $NewObj.html(RIContext.CurrObj.Elements.SharedElements.Value);
    else
        $NewObj.html(RIContext.CurrObj.Elements.NonSharedElements.Value);

    //If no value put in HTML empty
    if (RIContext.CurrObj.Elements.SharedElements.Value == "" || RIContext.CurrObj.Elements.NonSharedElements.Value == "")
        $NewObj.html("&nbsp");

    Style += GetMeasurements(GetMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex));
    Style += GetElementsStyle(RIContext.CurrObj.Elements);
    $NewObj.attr("Style", "-moz-box-sizing:border-box;box-sizing:border-box;" + Style + RIContext.Style);

    //Paragraphs
    //$.each(CurrObj.ReportItems, function (Index, Obj) { WriteReportItems(ReportObj, Obj, Index, CurrObj, $Col); });

    return RIContext.$HTMLParent;
}
function WriteImage(RIContext) {
    var $NewObj = $("<IMG/>");
    var Src = "/api/Report/GetImage/?";
    var Style = "max-height=100%;max-width:100%;" + GetElementsStyle(RIContext.CurrObj.Elements);

    //Measurements go on Parent
    Style += GetMeasurements(GetMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex));

    //Hack for Image size, need to handle clip, fit , fit proportional
    $NewObj.attr("Style", Style);

    //src parameters
    Src += "RepServer=" + RIContext.RS.ReportServerURL;
    Src += "&SessionID=" + RIContext.RS.SessionID;
    Src += "&ImageID=" + RIContext.CurrObj.Elements.NonSharedElements.ImageDataProperties.ImageName;
    $NewObj.attr("src", Src);
    $NewObj.attr("alt", "Cannot display image");
    return $NewObj;
}
function ResizeImage(img) {
    //TODO: this does not work
    if (img.height >= img.width) {
        img.maxheight = "100%";
        img.width = "auto";
    }
    else {
        img.maxwidth = "100%";
        img.height = "auto";
    }
}
function WriteTablix(RIContext) {
    var $Tablix = GetDefaultHTMLTable();
    var Style = "border-collapse:collapse;padding:0;";
    var $Row;
    var $Cell;
    var $Col;
    var $ColGroup = $("<ColGroup/>");
    var ColIndex = 0;
    var RowIndex = 0;
    var $RIDiv;
    var width;
    var bordersize = 0;

    Style += GetMeasurements(GetMeasurmentsObj(RIContext.CurrObjParent, RIContext.CurrObjIndex));

    Style += GetElementsStyle(RIContext.CurrObj.Elements);
    $Tablix.attr("Style", Style);

   // $.each(Context.CurrObj.ColumnWidths.Columns, function (Index, Obj) {
    //    $Col = new $("<Col/>");
    //    $Col.attr("Style", "width:" + Obj.Width + "mm;" + "max-width:" + Obj.Width + "mm;");
     //   $ColGroup.append($Col);
   // })
//    $Tablix.append($ColGroup);

    $Row = new $("<TR/>");
    $.each(RIContext.CurrObj.Content, function (Index, Obj) {
        if (Obj.Type != "BodyRow") {
            $Cell = new $("<TD/>");
         
            // Width and Border go on the Cell so we need to subtract out border width from content width, allign the TD to the Top in case another column grows
            Style = "vertical-align:top;";
            Style += GetFullBorderStyle(Obj);
            if (RIContext.CurrObj.ColumnWidths.Columns[ColIndex] != null) {
                // need to handle different left and right size borders
                if ((ColIndex == 0) && (ColIndex == (RIContext.CurrObj.ColumnWidths.ColumnCount - 1)))
                    bordersize = GetBorderSize(Obj, "Left") + GetBorderSize(Obj, "Right")
                else if (ColIndex == 0)
                    bordersize = GetBorderSize(Obj, "Left") + GetBorderSize(Obj, "Right")*.5
                else if (ColIndex == (RIContext.CurrObj.ColumnWidths.ColumnCount - 1))
                    bordersize = GetBorderSize(Obj, "Right") + GetBorderSize(Obj, "Left") * .5
                else
                    bordersize = GetBorderSize(Obj, "Right")*.5 + GetBorderSize(Obj, "Left") * .5

                width = RIContext.CurrObj.ColumnWidths.Columns[ColIndex].Width - bordersize;
                Style += "width:" + width + "mm;" + "max-width:" + width + "mm;" + "min-width:" + width + "mm;";
            }
            $Cell.attr("Style", Style);

            // Not sure why IE and Firefox do not work with box sizing, but block size works.
            if ($.browser.mozilla || $.browser.msie) 
                $Cell.append(WriteReportItems(new ReportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, new $("<Div/>"), "dispay:block;height:100%;width:100%;margin:0 0 0;")));
            else
                $Cell.append(WriteReportItems(new ReportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, new $("<Div/>"), "box-sizing:border-box;margin:0 0 0;")));
            $Row.append($Cell);
            ColIndex++;
        }
        //BodyRow in a table means new row
        else {
            ColIndex = 0;
            RowIndex++;
            $Tablix.append($Row);
            $Row = new $("<TR/>");            
        }
    })

    return $Tablix;
}
function WriteRectangle(RIContext) {
    var $RI;        //This is the ReportItem Object
    var $LocDiv;    //This DIV will have the top and left location set, location is not set anywhere else
    var Layout = new Object();  //This array holds the object that are before to determin location

    RIContext.$HTMLParent.attr("Style", GetElementsStyle(RIContext.CurrObj.Elements));

    $.each(RIContext.CurrObj.Content, function (Index, Obj) {             
        $RI = WriteReportItems(new ReportItemContext(RIContext.RS, Obj, Index, RIContext.CurrObj, new $("<Div/>"), ""));
        Layout[Index] = $RI;
        $LocDiv = SetLocation(new $("<Div/>"), RIContext.CurrObj.Measurement.Measurements, Layout, Index);        
        $LocDiv.append($RI);
        RIContext.$HTMLParent.append($LocDiv);
    });

    return RIContext.$HTMLParent;
}


function GetElementsStyle(CurrObj) {
    var Style = "";

    Style += GetStyle(CurrObj.SharedElements.Style, CurrObj.NonSharedElements);
    Style += GetStyle(CurrObj.NonSharedElements.Style, CurrObj.NonSharedElements);
    Style += "white-space:pre-wrap;";     
    return Style;
}
function GetBorderSize(CurrObj,Side) {
    var Obj;

    //Need left, top, right bottom border
    Obj = CurrObj.Elements.SharedElements.Style;
    if (Obj != null) {
        if (Side == "Left")
            if (Obj.BorderWidthLeft != null)
                return ConvertToMM(Obj.BorderWidthLeft);
            else
                return ConvertToMM(Obj.BorderWidth);
        else if (Side == "Right")
            if (Obj.BorderWidthRight != null)
                return ConvertToMM(Obj.BorderWidthRight);
            else
                return ConvertToMM(Obj.BorderWidth);
    }
    Obj = CurrObj.Elements.NonSharedElements.Style;
    if (Obj != null)
        if (Side == "Left")
            if (Obj.BorderWidthLeft != null)
                return ConvertToMM(Obj.BorderWidthLeft);
            else
                return ConvertToMM(Obj.BorderWidth);
        else if (Side == "Right")
            if (Obj.BorderWidthRight != null)
                return ConvertToMM(Obj.BorderWidthRight);
            else
                return ConvertToMM(Obj.BorderWidth);

    return 0;
}
function GetFullBorderStyle(CurrObj) {
    var Style = "";
    var Obj;

    //Need left, top, right bottom border
    Obj = CurrObj.Elements.SharedElements.Style;
    if (Obj != null) {
        if (Obj.BorderStyle != null)
            Style += "border:" + Obj.BorderWidth + " " + GetBorderStyle(Obj.BorderStyle) + " " + Obj.BorderColor + ";";
        if (Obj.BorderStyleLeft != null || Obj.BorderWidthLeft != null || Obj.BorderColorLeft != null)
            Style += "border-left:" + ((Obj.BorderWidthLeft == null) ? Obj.BorderWidth : Obj.BorderWidthLeft) + " " + ((Obj.BorderStyleLeft == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleLeft)) + " " + ((Obj.BorderColorLeft == null) ? Obj.BorderColor : Obj.BorderColorLeft) + ";";
        if (Obj.BorderStyleRight != null || Obj.BorderWidthRight != null || Obj.BorderColorRight != null)
            Style += "border-right:" + ((Obj.BorderWidthRight == null) ? Obj.BorderWidth : Obj.BorderWidthRight) + " " + ((Obj.BorderStyleRight == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleRight)) + " " + ((Obj.BorderColorRight == null) ? Obj.BorderColr : Obj.BorderColorRight) + ";";
        if (Obj.BorderStyleTop != null || Obj.BorderWidthTop != null || Obj.BorderColorTop != null)
            Style += "border-top:" + ((Obj.BorderWidthTop == null) ? Obj.BorderWidth : Obj.BorderWidthTop) + " " + ((Obj.BorderStyleTop == null) ? GetBorderStyle(Obj.BorderStyle) :GetBorderStyle(Obj.BorderStyleTop)) + " " + ((Obj.BorderColorTop == null) ? Obj.BorderColor : Obj.BorderColorTop) + ";";
        if (Obj.BorderStyleBottom != null || Obj.BorderWidthBottom != null || Obj.BorderColorBottom != null)
            Style += "border-bottom:" + ((Obj.BorderWidthBottom == null) ? Obj.BorderWidth : Obj.BorderWidthBottom) + " " + ((Obj.BorderStyleBottom == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleBottom)) + " " + ((Obj.BorderColorBottom == null) ? Obj.BorderColor : Obj.BorderColorBottom )+ ";";
    }
    Obj = CurrObj.Elements.NonSharedElements.Style;
    if (Obj != null){
        if (Obj.BorderStyle != null)
            Style += "border:" + Obj.BorderWidth + " " + GetBorderStyle(Obj.BorderStyle) + " " + Obj.BorderColor + ";";
        if (Obj.BorderStyleLeft != null || Obj.BorderWidthLeft != null || Obj.BorderColorLeft != null)
            Style += "border-left:" + ((Obj.BorderWidthLeft == null) ? Obj.BorderWidth : Obj.BorderWidthLeft) + " " + ((Obj.BorderStyleLeft == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleLeft)) + " " + ((Obj.BorderColorLeft == null) ? Obj.BorderColor : Obj.BorderColorLeft) + ";";
        if (Obj.BorderStyleRight != null || Obj.BorderWidthRight != null || Obj.BorderColorRight != null)
            Style += "border-right:" + ((Obj.BorderWidthRight == null) ? Obj.BorderWidth : Obj.BorderWidthRight) + " " + ((Obj.BorderStyleRight == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleRight)) + " " + ((Obj.BorderColorRight == null) ? Obj.BorderColr : Obj.BorderColorRight) + ";";
        if (Obj.BorderStyleTop != null || Obj.BorderWidthTop != null || Obj.BorderColorTop != null)
            Style += "border-top:" + ((Obj.BorderWidthTop == null) ? Obj.BorderWidth : Obj.BorderWidthTop) + " " + ((Obj.BorderStyleTop == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleTop)) + " " + ((Obj.BorderColorTop == null) ? Obj.BorderColor : Obj.BorderColorTop) + ";";
        if (Obj.BorderStyleBottom != null || Obj.BorderWidthBottom != null || Obj.BorderColorBottom != null)
            Style += "border-bottom:" + ((Obj.BorderWidthBottom == null) ? Obj.BorderWidth : Obj.BorderWidthBottom) + " " + ((Obj.BorderStyleBottom == null) ? GetBorderStyle(Obj.BorderStyle) : GetBorderStyle(Obj.BorderStyleBottom)) + " " + ((Obj.BorderColorBottom == null) ? Obj.BorderColor : Obj.BorderColorBottom) + ";";
    }
    return Style;
}
function GetMeasurements(CurrObj) {
    var Style = "";
    //TODO:  zIndex

    if (CurrObj == null)
        return "";

    //Top and left are set in set location, height is not set becasue differnt browsers measure and break words differently
    if (CurrObj.Width != null) {
        Style += "width:" + CurrObj.Width  + "mm;";
        Style += "min-width:" + CurrObj.Width + "mm;";
        Style += "max-width:" + (CurrObj.Width) + "mm;";
    }

    return Style;
}
function GetStyle(CurrObj, TypeCodeObj) {
    var Style = "";

    if (CurrObj == null)
        return Style;
   
    if (CurrObj.BackgroundColor != null)
        Style += "background-color:" + CurrObj.BackgroundColor + ";";   
    if (CurrObj.UnicodeBiDi != null)
        Style += "unicode-bidi:" + GetBiDi(CurrObj.UnicodeBiDi) + ";";
    if (CurrObj.VerticalAlign != null)
        Style += "vertical-align:" + GetVAligh(CurrObj.VerticalAlign) + ";";
    if (CurrObj.WritingMode != null)
        Style += "layout-flow:" + GetLayoutFlow(CurrObj.WritingMode) + ";";
    if (CurrObj.Direction != null)
        Style += "Direction:" + GetDirection(CurrObj.Direction) + ";";
    if (CurrObj.PaddingBottom != null)
        Style += "padding-bottom:" + CurrObj.PaddingBottom + ";";
    if (CurrObj.PaddingLeft != null)
        Style += "padding-left:" + CurrObj.PaddingLeft + ";";
    if (CurrObj.PaddingRight != null)
        Style += "padding-right:" + CurrObj.PaddingRight + ";";
    if (CurrObj.PaddingTop != null)
        Style += "padding-top:" + CurrObj.PaddingTop + ";";
    if (CurrObj.TextAlign != null)
        Style += "text-align:" + GetTextAlign(CurrObj.TextAlign, TypeCodeObj) + ";";
    if (CurrObj.FontStyle != null)
        Style += "font-style:" + GetFontStyle(CurrObj.FontStyle) + ";";
    if (CurrObj.FontWeight != null)
        Style += "font-weight:" + GetFontWeight(CurrObj.FontWeight) + ";";
    if (CurrObj.FontFamily != null)
        Style += "font-family:" + CurrObj.FontFamily + ";";
    if (CurrObj.FontSize != null)
        Style += "font-size:" + CurrObj.FontSize + ";";
    if (CurrObj.TextDecoration != null)
        Style += "text-decoration:" + GetTextDecoration(CurrObj.TextDecoration) + ";";
    if (CurrObj.Color != null)
        Style += "color:" + CurrObj.Color + ";";
 //   if (CurrObj.Calendar != null)
 //       Style += "calendar:" + GetCalendar(CurrObj.Calendar) + ";";
    //writing-mode:lr-tb;?
   
    return Style;
}
function GetCalendar(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "Gregorian";
            break;
        case 1:
            return "GregorianArabic";
            break;
        case 2:
            return "GregorianMiddleEastFrench";
            break
        case 3:
            return "GregorianTransliteratedEnglish";
            break
        case 4:
            return "GregorianTransliteratedFrench";
            break
        case 5:
            return "GregorianUSEnglish";
            break
        case 6:
            return "Hebrew";
            break
        case 7:
            return "Hijri";
            break
        case 9:
            return "Korean";
            break
        case 10:
            return "Julian";
            break
        case 11:
            return "Taiwan";
            break
        case 12:
            return "ThaiBuddist";
            break
    }
    return "Gregorian";
}
function GetTextDecoration(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "None";
            break;
        case 1:
            return "Underline";
            break;
        case 2:
            return "Overline";
            break
        case 3:
            return "LineThrough";
            break
    }
    return "None";
}
function GetFontWeight(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "Normal";
            break;
        case 1:
            return "Thin";
            break;
        case 2:
            return "ExtraLight";
            break
        case 3:
            return "Light";
            break
        case 4:
            return "Medium";
            break
        case 5:
            return "SemiBold";
            break
        case 6:
            return "Bold";
            break
        case 7:
            return "ExtraBold";
            break
        case 8:
            return "Heavy";
            break
    }
    return "General";
}
function GetFontStyle(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "Normal";
            break;
        case 1:
            return "Italic";
            break;
    }
    return "Normal";
}
function GetTextAlign(RPLCode, TypeCodeObj) {
    switch (RPLCode) {
        case 0:
            //Default is string, need to handle direction, 15 seems to be decimal not datetime
            if (TypeCodeObj.TypeCode == null)
                return "Left";
            switch (TypeCodeObj.TypeCode) {
                case 3,6,7,9,11,12,13,14,15:
                    return "Right";
                    break;
                case 4, 17:
                    return "Left";
                    break;
                default:
                    return "Left";
            }
            
            break;
        case 1:
            return "Left";
            break;
        case 2:
            return "Center";
            break
        case 3:
            return "Right";
            break       
    }
    
}
function GetDirection(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "LTR";
            break;
        case 1:
            return "RTL";
            break;
       
    }
    return "LTR";
}
function GetLayoutFlow(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "Horizontal";
            break;
        case 1:
            return "Vertical";
            break;
        case 2:
            return "Rotate270";
            break;
    }
    return "Horizontal";
}
function GetVAligh(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "Top";
            break;
        case 1:
            return "Middle";
            break;
        case 2:
            return "Bottom";
            break;
    }
    return "Top";
}
function GetBiDi(RPLCode) {
    switch (RPLCode) {
        case 0:
            return "normal";
            break;
        case 1:
            return "embed";
            break;
        case 2:
            return "BiDiOverride";
            break;
    }
    return "normal";
}
function GetDefaultHTMLTable() {
    var $NewObj = $("<Table/>");

    $NewObj.attr("CELLSPACING", 0);
    $NewObj.attr("CELLPADDING", 0);
    return $NewObj;
}
function GetDefaultHTMLDiv() {
    var $NewObj = $("<Div/>");

    $NewObj.attr("HEIGHT", "100%");
    $NewObj.attr("WIDTH", "100%");   
    return $NewObj;
}
function GetBorderStyle(RPLStyle) {    
    switch (RPLStyle) {
        case 0:
            return "None";
            break;
        case 1:
            return "Dotted";
            break;
        case 2:
            return "Dashed";
            break;
        case 3:
            return "Solid";
            break;
        case 4:
            return "Double";
            break;
    }
    return "None";
}
function GetMeasurmentsObj(CurrObj,Index) {
    var retval = null;

    if (CurrObj.Measurement != null)
        retval = CurrObj.Measurement.Measurements[Index];
    return retval;
}
function GetTableRow() {
    var retval = new $("<TR/>");
    retval.attr("Height", 0);
    return retval;
}
function ConvertToMM(ConvertFrom) {
    var unit = ConvertFrom.match(/\D+$/)[0];  // get the existing unit
    var value = ConvertFrom.match(/\d+/)[0];  // get the numeric component

    switch (unit) {
        case "px":
            return value / 3.78;
            break;
        case "pt":
            return value * 0.352777777778;
            break;
        case "in":
            return value * 25.4;
            break;
        case "mm":
            return value;
            break;
        case "cm":
            return value * 10;
            break;
        case "em":
            return value * 4.2175176;
            break;
    }

    //This is an error
    return value;
}
