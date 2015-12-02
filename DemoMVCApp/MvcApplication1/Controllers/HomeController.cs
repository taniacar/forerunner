﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Forerunner.ReportControl;


namespace MvcApplication1.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            ViewBag.Message = "Modify this template to jump-start your ASP.NET MVC application.";

            return View();
        }

        public ActionResult About()
        {
            string RepURL;

            //RepURL = "192.168.1.105/reportserver/";
            RepURL = "localhost:8080/reportserver/";

            Report Rep = new Report(RepURL);
            ViewBag.Message = "Your app description page.";


            //ViewBag.Report = Rep.GetReportHTML("/AdventureWorks 2008R2/Sales By Sales Person");
            //ViewBag.Report = Rep.GetReportJson("/AdventureWorks 2008R2/Sales By Sales Person","","0");
            ViewBag.ReportScript = Rep.GetReportScript();
            ViewBag.Report1 = Rep.GetReportInitScript("/Northwind Test Reports/Simple Table with groups and drill down");
            ViewBag.Report2 = Rep.GetReportInitScript("/Northwind Test Reports/Simple Table with groups and drill down");

            return View();
        }

        public ActionResult Contact()
        {
            ViewBag.Message = "Your contact page.";

            return View();
        }
    }
}