﻿//------------------------------------------------------------------------------
// <auto-generated>
//     This code was generated by a tool.
//     Runtime Version:4.0.30319.17929
//
//     Changes to this file may cause incorrect behavior and will be lost if
//     the code is regenerated.
// </auto-generated>
//------------------------------------------------------------------------------

namespace Forerunner.Tools.SharepointUploader.Properties {
    using System;
    
    
    /// <summary>
    ///   A strongly-typed resource class, for looking up localized strings, etc.
    /// </summary>
    // This class was auto-generated by the StronglyTypedResourceBuilder
    // class via a tool like ResGen or Visual Studio.
    // To add or remove a member, edit your .ResX file then rerun ResGen
    // with the /str option, or rebuild your VS project.
    [global::System.CodeDom.Compiler.GeneratedCodeAttribute("System.Resources.Tools.StronglyTypedResourceBuilder", "4.0.0.0")]
    [global::System.Diagnostics.DebuggerNonUserCodeAttribute()]
    [global::System.Runtime.CompilerServices.CompilerGeneratedAttribute()]
    internal class Resources {
        
        private static global::System.Resources.ResourceManager resourceMan;
        
        private static global::System.Globalization.CultureInfo resourceCulture;
        
        [global::System.Diagnostics.CodeAnalysis.SuppressMessageAttribute("Microsoft.Performance", "CA1811:AvoidUncalledPrivateCode")]
        internal Resources() {
        }
        
        /// <summary>
        ///   Returns the cached ResourceManager instance used by this class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Resources.ResourceManager ResourceManager {
            get {
                if (object.ReferenceEquals(resourceMan, null)) {
                    global::System.Resources.ResourceManager temp = new global::System.Resources.ResourceManager("Forerunner.Tools.SharepointUploader.Properties.Resources", typeof(Resources).Assembly);
                    resourceMan = temp;
                }
                return resourceMan;
            }
        }
        
        /// <summary>
        ///   Overrides the current thread's CurrentUICulture property for all
        ///   resource lookups using this strongly typed resource class.
        /// </summary>
        [global::System.ComponentModel.EditorBrowsableAttribute(global::System.ComponentModel.EditorBrowsableState.Advanced)]
        internal static global::System.Globalization.CultureInfo Culture {
            get {
                return resourceCulture;
            }
            set {
                resourceCulture = value;
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Access denied to resource [{0}]. Check the credenials specified..
        /// </summary>
        internal static string LiveHttpClientContext_AccessDenied {
            get {
                return ResourceManager.GetString("LiveHttpClientContext_AccessDenied", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The login form has changed. This code is no longer compatible with the site..
        /// </summary>
        internal static string LiveHttpClientContext_LoginFormChangedError {
            get {
                return ResourceManager.GetString("LiveHttpClientContext_LoginFormChangedError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The web page protocol has changed. Response code [{0}] was not expected at this time..
        /// </summary>
        internal static string LiveHttpClientContext_ProtocolError {
            get {
                return ResourceManager.GetString("LiveHttpClientContext_ProtocolError", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to The upload of [{0}] failed with status [{1}]. Description [{2}]. [{3}]..
        /// </summary>
        internal static string SaveBinaryDirect_UploadFailed {
            get {
                return ResourceManager.GetString("SaveBinaryDirect_UploadFailed", resourceCulture);
            }
        }
        
        /// <summary>
        ///   Looks up a localized string similar to Sharepoint Uploader v1.0
        ///Copyright (C) 2013 Forerunner Software
        ///Usage:
        ///SharepointUploader.exe [Options] &lt;Source Dir&gt; &lt;Target Path&gt;
        ///Options:
        ////s[ite] &lt;Sharepoint URL&gt; - Specify the Sharepoint site to connect to.
        ///Source Dir: Local or UNC path to the root of the files to upload.
        ///Target Path: Relative Path to the document path to save the files..
        /// </summary>
        internal static string Usage {
            get {
                return ResourceManager.GetString("Usage", resourceCulture);
            }
        }
    }
}
