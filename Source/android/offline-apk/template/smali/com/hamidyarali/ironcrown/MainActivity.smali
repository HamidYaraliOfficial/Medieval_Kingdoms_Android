.class public Lcom/hamidyarali/ironcrown/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/MemberClasses;
    value = {
        Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;
    }
.end annotation


# static fields
.field private static final ASSET_DIR:Ljava/lang/String; = "www"

.field private static final BACK_SCRIPT:Ljava/lang/String; = "(function(){try{var a=window.__ic;if(a&&a.back)return a.back();}catch(e){}return \'exit\';})()"

.field private static final HOST:Ljava/lang/String; = "appassets.androidplatform.net"

.field private static final SAVE_SCRIPT:Ljava/lang/String; = "try{window.dispatchEvent(new Event(\'pagehide\'));}catch(e){}"

.field private static final START_URL:Ljava/lang/String; = "https://appassets.androidplatform.net/index.html"


# instance fields
.field private web:Landroid/webkit/WebView;


# direct methods
.method public constructor <init>()V
    .locals 0

    .line 32
    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method

.method static synthetic access$100(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;
    .locals 0

    .line 32
    invoke-static {p0, p1, p2, p3}, Lcom/hamidyarali/ironcrown/MainActivity;->response(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$200(Ljava/lang/String;)Ljava/lang/String;
    .locals 0

    .line 32
    invoke-static {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->mimeFor(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p0

    return-object p0
.end method

.method static synthetic access$300(Ljava/lang/String;Ljava/io/InputStream;)Landroid/webkit/WebResourceResponse;
    .locals 0

    .line 32
    invoke-static {p0, p1}, Lcom/hamidyarali/ironcrown/MainActivity;->stream(Ljava/lang/String;Ljava/io/InputStream;)Landroid/webkit/WebResourceResponse;

    move-result-object p0

    return-object p0
.end method

.method private static isText(Ljava/lang/String;)Z
    .locals 1

    .line 182
    const-string v0, "text/"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_1

    const-string v0, "application/javascript"

    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1

    const-string v0, "application/json"

    .line 183
    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-nez v0, :cond_1

    const-string v0, "image/svg+xml"

    invoke-virtual {p0, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p0

    if-eqz p0, :cond_0

    goto :goto_0

    :cond_0
    const/4 p0, 0x0

    goto :goto_1

    :cond_1
    :goto_0
    const/4 p0, 0x1

    :goto_1
    return p0
.end method

.method private static mimeFor(Ljava/lang/String;)Ljava/lang/String;
    .locals 1

    .line 187
    sget-object v0, Ljava/util/Locale;->ROOT:Ljava/util/Locale;

    invoke-virtual {p0, v0}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object p0

    .line 188
    const-string v0, ".html"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_9

    const-string v0, ".htm"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_0

    goto :goto_0

    .line 189
    :cond_0
    const-string v0, ".js"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_1

    const-string p0, "application/javascript"

    return-object p0

    .line 190
    :cond_1
    const-string v0, ".css"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_2

    const-string p0, "text/css"

    return-object p0

    .line 191
    :cond_2
    const-string v0, ".json"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_3

    const-string p0, "application/json"

    return-object p0

    .line 192
    :cond_3
    const-string v0, ".woff2"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_4

    const-string p0, "font/woff2"

    return-object p0

    .line 193
    :cond_4
    const-string v0, ".woff"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_5

    const-string p0, "font/woff"

    return-object p0

    .line 194
    :cond_5
    const-string v0, ".svg"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_6

    const-string p0, "image/svg+xml"

    return-object p0

    .line 195
    :cond_6
    const-string v0, ".png"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_7

    const-string p0, "image/png"

    return-object p0

    .line 196
    :cond_7
    const-string v0, ".txt"

    invoke-virtual {p0, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result p0

    if-eqz p0, :cond_8

    const-string p0, "text/plain"

    return-object p0

    .line 197
    :cond_8
    const-string p0, "application/octet-stream"

    return-object p0

    .line 188
    :cond_9
    :goto_0
    const-string p0, "text/html"

    return-object p0
.end method

.method private static response(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;
    .locals 8

    .line 177
    new-instance v7, Landroid/webkit/WebResourceResponse;

    new-instance v5, Ljava/util/HashMap;

    invoke-direct {v5}, Ljava/util/HashMap;-><init>()V

    new-instance v6, Ljava/io/ByteArrayInputStream;

    invoke-direct {v6, p3}, Ljava/io/ByteArrayInputStream;-><init>([B)V

    const-string v2, "utf-8"

    move-object v0, v7

    move-object v1, p0

    move v3, p1

    move-object v4, p2

    invoke-direct/range {v0 .. v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V

    return-object v7
.end method

.method private static stream(Ljava/lang/String;Ljava/io/InputStream;)Landroid/webkit/WebResourceResponse;
    .locals 8

    .line 170
    invoke-static {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->isText(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_0

    const-string v0, "utf-8"

    goto :goto_0

    :cond_0
    const/4 v0, 0x0

    :goto_0
    move-object v3, v0

    .line 171
    new-instance v6, Ljava/util/HashMap;

    invoke-direct {v6}, Ljava/util/HashMap;-><init>()V

    .line 172
    const-string v0, "Cache-Control"

    const-string v1, "no-cache"

    invoke-interface {v6, v0, v1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;

    .line 173
    new-instance v0, Landroid/webkit/WebResourceResponse;

    const/16 v4, 0xc8

    const-string v5, "OK"

    move-object v1, v0

    move-object v2, p0

    move-object v7, p1

    invoke-direct/range {v1 .. v7}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V

    return-object v0
.end method


.method private hideBars()V
    .locals 2
    invoke-virtual {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;
    move-result-object v0
    const/16 v1, 0x1706
    invoke-virtual {v0, v1}, Landroid/view/View;->setSystemUiVisibility(I)V
    return-void
.end method

# virtual methods
.method public onBackPressed()V
    .locals 3

    .line 91
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    if-nez v0, :cond_0

    .line 92
    invoke-virtual {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->finish()V

    return-void

    .line 95
    :cond_0
    new-instance v1, Lcom/hamidyarali/ironcrown/MainActivity$1;

    invoke-direct {v1, p0}, Lcom/hamidyarali/ironcrown/MainActivity$1;-><init>(Lcom/hamidyarali/ironcrown/MainActivity;)V

    const-string v2, "(function(){try{var a=window.__ic;if(a&&a.back)return a.back();}catch(e){}return \'exit\';})()"

    invoke-virtual {v0, v2, v1}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 3

    .line 63
    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V
    invoke-virtual {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->getWindow()Landroid/view/Window;
    move-result-object v0
    const/16 v1, 0x80
    invoke-virtual {v0, v1}, Landroid/view/Window;->addFlags(I)V
    invoke-direct {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->hideBars()V

    .line 65
    new-instance p1, Landroid/webkit/WebView;

    invoke-direct {p1, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    .line 66
    sget v0, Lcom/hamidyarali/ironcrown/R$color;->page_bg:I

    invoke-virtual {p0, v0}, Lcom/hamidyarali/ironcrown/MainActivity;->getColor(I)I

    move-result v0

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setBackgroundColor(I)V

    .line 67
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    const/4 v0, 0x2

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setOverScrollMode(I)V

    .line 68
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v1, Landroid/view/ViewGroup$LayoutParams;

    const/4 v2, -0x1

    invoke-direct {v1, v2, v2}, Landroid/view/ViewGroup$LayoutParams;-><init>(II)V

    invoke-virtual {p0, p1, v1}, Lcom/hamidyarali/ironcrown/MainActivity;->setContentView(Landroid/view/View;Landroid/view/ViewGroup$LayoutParams;)V

    .line 71
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {p1}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object p1

    const/4 v1, 0x1

    .line 72
    invoke-virtual {p1, v1}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    .line 73
    invoke-virtual {p1, v1}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    const/4 v2, 0x0

    .line 74
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V

    .line 75
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    .line 76
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setSupportZoom(Z)V

    .line 77
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setBuiltInZoomControls(Z)V

    const/16 v2, 0x64

    .line 78
    invoke-virtual {p1, v2}, Landroid/webkit/WebSettings;->setTextZoom(I)V

    .line 80
    invoke-virtual {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->getApplicationInfo()Landroid/content/pm/ApplicationInfo;

    move-result-object p1

    iget p1, p1, Landroid/content/pm/ApplicationInfo;->flags:I

    and-int/2addr p1, v0

    if-eqz p1, :cond_0

    .line 82
    invoke-static {v1}, Landroid/webkit/WebView;->setWebContentsDebuggingEnabled(Z)V

    .line 85
    :cond_0
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    new-instance v0, Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;

    const/4 v1, 0x0

    invoke-direct {v0, p0, v1}, Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;-><init>(Lcom/hamidyarali/ironcrown/MainActivity;Lcom/hamidyarali/ironcrown/MainActivity$1;)V

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    .line 86
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    const-string v0, "https://appassets.androidplatform.net/index.html"

    invoke-virtual {p1, v0}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    return-void
.end method

.method protected onDestroy()V
    .locals 2

    .line 125
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_1

    .line 126
    invoke-virtual {v0}, Landroid/webkit/WebView;->getParent()Landroid/view/ViewParent;

    move-result-object v0

    check-cast v0, Landroid/view/ViewGroup;

    if-eqz v0, :cond_0

    .line 128
    iget-object v1, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0, v1}, Landroid/view/ViewGroup;->removeView(Landroid/view/View;)V

    .line 130
    :cond_0
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V

    const/4 v0, 0x0

    .line 131
    iput-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    .line 133
    :cond_1
    invoke-super {p0}, Landroid/app/Activity;->onDestroy()V

    return-void
.end method

.method public onWindowFocusChanged(Z)V
    .locals 0
    invoke-super {p0, p1}, Landroid/app/Activity;->onWindowFocusChanged(Z)V
    if-eqz p1, :cond_0
    invoke-direct {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->hideBars()V
    :cond_0
    return-void
.end method

.method protected onPause()V
    .locals 3

    .line 108
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_0

    .line 109
    const-string v1, "try{window.dispatchEvent(new Event(\'pagehide\'));}catch(e){}"

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    .line 110
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->onPause()V

    .line 112
    :cond_0
    invoke-super {p0}, Landroid/app/Activity;->onPause()V

    return-void
.end method

.method protected onResume()V
    .locals 1

    .line 117
    invoke-super {p0}, Landroid/app/Activity;->onResume()V
    invoke-direct {p0}, Lcom/hamidyarali/ironcrown/MainActivity;->hideBars()V

    .line 118
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity;->web:Landroid/webkit/WebView;

    if-eqz v0, :cond_0

    .line 119
    invoke-virtual {v0}, Landroid/webkit/WebView;->onResume()V

    :cond_0
    return-void
.end method
