﻿using System;
using System.Collections.Generic;
using System.Configuration;
using System.Web;
using System.Web.Mvc;
using System.Web.Security;
using ReportManager.Models;
using Forerunner.Security;

namespace ReportManager.Controllers
{
    [Authorize]
    public class LoginController : Controller
    {
        private string timeout = ConfigurationManager.AppSettings["Forerunner.FormsAuthenticationTimeout"];

        [AllowAnonymous]
        public ActionResult Login(string returnUrl, string hashTag)
        {
            ViewBag.ReturnUrl = returnUrl;
            ViewBag.HashTag = hashTag;
            return View();
        }



        private const int defaultTimeout = 30;
        private int GetTimeout()
        {
            int returnValue = defaultTimeout;
            if (timeout != null)
            {
                
                try
                {
                    returnValue = Int32.Parse(timeout);
                }
                catch
                {
                    returnValue = defaultTimeout;
                }
            }

            return returnValue;
        }

        [HttpPost]
        [AllowAnonymous]
        [ValidateAntiForgeryToken]
        public ActionResult Login(LoginModel model, string returnUrl = null)
        {
            if (ModelState.IsValid && 
                Forerunner.Security.AuthenticationMode.GetAuthenticationMode() == System.Web.Configuration.AuthenticationMode.Forms)
            {
               
                if (FormsAuthenticationHelper.Login(model.UserName, model.Password, GetTimeout()))
                {
                    return CheckNullAndRedirect(returnUrl);
                } else {
                    return CheckNullAndRedirect(returnUrl);
                }
            }
            return View(model);
        }

        private ActionResult CheckNullAndRedirect(string returnUrl)
        {
            if (returnUrl == null)
            {
                return RedirectToAction("Index", "Home");                
            }
            else
            {
                return Redirect(returnUrl);
            }
        }

        [HttpGet]
        public ActionResult LogOff(string returnUrl)
        {
            FormsAuthentication.SignOut();

            if (returnUrl == null)
            {
                return RedirectToAction("Index", "Home");
            }
            else
            {
                return Redirect(returnUrl);
            }
        }
    }
}
