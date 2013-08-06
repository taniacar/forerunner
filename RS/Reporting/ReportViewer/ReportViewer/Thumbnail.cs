﻿using System;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using System.Collections;
using System.Net;

namespace Forerunner.Thumbnail
{
       
    public class WebSiteThumbnail:IDisposable
    {
        
        private string HTML = null;      
        private Bitmap bmp = null;
        private byte[] MHTML = null;
        private Stream sMHTML = null;
        private double maxHeightToWidthRatio = 0;
        private int ThreadingAttempts = 0;

        public Bitmap Image 
        {
            get 
            { 
                return bmp; 
            } 
        }

        private System.Func<string, string> callback = null;

        public static Bitmap GetStreamThumbnail(string HTML, double maxHeightToWidthRatio, System.Func<string, string> callback)
        {
            WebSiteThumbnail thumb = new WebSiteThumbnail(HTML, maxHeightToWidthRatio, callback);
            Bitmap b = thumb.GetScreenShot();            
            return b;
        }
        public static Bitmap GetStreamThumbnail(byte[] MHTML, double maxHeightToWidthRatio)
        {
            WebSiteThumbnail thumb = new WebSiteThumbnail(MHTML, maxHeightToWidthRatio);
            Bitmap b = thumb.GetScreenShot();            
            return b;
        }
        public static Bitmap GetStreamThumbnail(Stream MHTML, double maxHeightToWidthRatio)
        {
            WebSiteThumbnail thumb = new WebSiteThumbnail(MHTML, maxHeightToWidthRatio);
            Bitmap b = thumb.GetScreenShot();
            return b;
        }
        public WebSiteThumbnail(string HTML, double maxHeightToWidthRatio, System.Func<string, string> callback)
        {
            this.HTML = HTML;
            this.maxHeightToWidthRatio = maxHeightToWidthRatio;
            this.callback = callback;
        }

        public WebSiteThumbnail(byte[] MHTML, double maxHeightToWidthRatio)
        {
            this.MHTML = MHTML;
            this.maxHeightToWidthRatio = maxHeightToWidthRatio;            
        }
        public WebSiteThumbnail(Stream MHTML, double maxHeightToWidthRatio)
        {
            this.sMHTML = MHTML;
            this.maxHeightToWidthRatio = maxHeightToWidthRatio;
        }

        public Bitmap GetScreenShot()
        {

            if (ThreadingAttempts++ > 10)
                return null;

            Thread t = new Thread(new ThreadStart(this._GetScreenShot));
            t.SetApartmentState(ApartmentState.STA);
            t.Start();
            t.Join();
            return bmp;
        }
        
        private void _GetScreenShot()
        {
            if (Thread.CurrentThread.GetApartmentState() != ApartmentState.STA)
            {
                GetScreenShot();
                return;
            }

            WebBrowser webBrowser = new WebBrowser();
            webBrowser.ScrollBarsEnabled = false;
            string fileName = null;

            if (MHTML == null && sMHTML == null)
            {
                int length = 0;               
                webBrowser.Navigate("about:blank");
                webBrowser.Document.OpenNew(true);
                while (webBrowser.Document == null && webBrowser.Document.Body == null)
                    Application.DoEvents();
                webBrowser.Document.Write(this.HTML);
                foreach (HtmlElement he in webBrowser.Document.Images)
                {
                    string src = he.GetAttribute("src");
                    string s = callback(src);
                    he.SetAttribute("src", s);
                    length += s.Length;
                    if (length > 1024 * 10000) break;  //Limit the size
                }
                webBrowser.Document.Body.InnerHtml = webBrowser.Document.Body.InnerHtml;
                webBrowser.Update();
            }
            else
            {
                fileName = Path.GetTempPath() + Path.GetRandomFileName() + ".mht";
                if (MHTML != null)
                    System.IO.File.WriteAllBytes(fileName, MHTML);
                if (sMHTML != null)
                {
                    FileStream f = System.IO.File.OpenWrite(fileName);
                    byte[] buffer = new byte[8 * 1024];
                    int len;
                    while ((len = sMHTML.Read(buffer, 0, buffer.Length)) > 0)
                    {
                        f.Write(buffer, 0, len);
                    }
                    f.Close();
                }
                webBrowser.Url = new System.Uri(fileName);
                while ( webBrowser.ReadyState != WebBrowserReadyState.Complete )
                    Application.DoEvents();
            }
            
            SetIamge(webBrowser);
            if (fileName != null)
                File.Delete(fileName);
        }

        private void SetIamge(WebBrowser webBrowser)
        {
            
            int w = webBrowser.Document.Body.ScrollRectangle.Width;
            int h = webBrowser.Document.Body.ScrollRectangle.Height;
            if (w > 1500) w = 1500; //Set an upper bound to limit the size
            if (maxHeightToWidthRatio > 0 && h > w * maxHeightToWidthRatio)
            {
                h = (int) (w * maxHeightToWidthRatio);
            }
            if (h > 1500) h = 1500;  //Set an upper bound to limit the size
            
            webBrowser.ClientSize = new Size(w,h );
            webBrowser.ScrollBarsEnabled = false;
            bmp = new Bitmap(w, h);
            
            webBrowser.BringToFront();
            webBrowser.DrawToBitmap(bmp, webBrowser.Bounds);
            webBrowser.Navigate("about:blank");
            webBrowser.Dispose();

       
        }

        protected virtual void Dispose(bool disposing)
        {
            if (disposing)
            {
                bmp.Dispose();
            }
        }

        public void Dispose()
        {
            Dispose(true);
            GC.SuppressFinalize(this);
        }

    }
}
