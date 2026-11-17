.class final Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;
.super Landroid/webkit/WebViewClient;
.source "MainActivity.java"


# annotations
.annotation system Ldalvik/annotation/EnclosingClass;
    value = Lcom/hamidyarali/ironcrown/MainActivity;
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x12
    name = "AssetClient"
.end annotation


# instance fields
.field final synthetic this$0:Lcom/hamidyarali/ironcrown/MainActivity;


# direct methods
.method private constructor <init>(Lcom/hamidyarali/ironcrown/MainActivity;)V
    .locals 0

    .line 137
    iput-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;->this$0:Lcom/hamidyarali/ironcrown/MainActivity;

    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method

.method synthetic constructor <init>(Lcom/hamidyarali/ironcrown/MainActivity;Lcom/hamidyarali/ironcrown/MainActivity$1;)V
    .locals 0

    .line 137
    invoke-direct {p0, p1}, Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;-><init>(Lcom/hamidyarali/ironcrown/MainActivity;)V

    return-void
.end method


# virtual methods
.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .locals 6

    const-string p1, "www"

    .line 141
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;

    move-result-object p2

    .line 142
    const-string v0, "appassets.androidplatform.net"

    invoke-virtual {p2}, Landroid/net/Uri;->getHost()Ljava/lang/String;

    move-result-object v1

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    const/4 v1, 0x0

    const-string v2, "text/plain"

    if-nez v0, :cond_0

    .line 143
    const-string p1, "Forbidden"

    new-array p2, v1, [B

    const/16 v0, 0x193

    invoke-static {v2, v0, p1, p2}, Lcom/hamidyarali/ironcrown/MainActivity;->access$100(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;

    move-result-object p1

    return-object p1

    .line 146
    :cond_0
    invoke-virtual {p2}, Landroid/net/Uri;->getPath()Ljava/lang/String;

    move-result-object p2

    if-eqz p2, :cond_1

    .line 147
    invoke-virtual {p2}, Ljava/lang/String;->length()I

    move-result v0

    if-eqz v0, :cond_1

    const-string v0, "/"

    invoke-virtual {p2, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_2

    .line 148
    :cond_1
    const-string p2, "/index.html"

    .line 150
    :cond_2
    const-string v0, ".."

    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    const-string v3, "Not Found"

    const/16 v4, 0x194

    if-eqz v0, :cond_3

    .line 151
    new-array p1, v1, [B

    invoke-static {v2, v4, v3, p1}, Lcom/hamidyarali/ironcrown/MainActivity;->access$100(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;

    move-result-object p1

    return-object p1

    .line 155
    :cond_3
    :try_start_0
    iget-object v0, p0, Lcom/hamidyarali/ironcrown/MainActivity$AssetClient;->this$0:Lcom/hamidyarali/ironcrown/MainActivity;

    invoke-virtual {v0}, Lcom/hamidyarali/ironcrown/MainActivity;->getAssets()Landroid/content/res/AssetManager;

    move-result-object v0

    new-instance v5, Ljava/lang/StringBuilder;

    invoke-direct {v5, p1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v5, p2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    move-result-object p1

    invoke-virtual {p1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object p1

    invoke-virtual {v0, p1}, Landroid/content/res/AssetManager;->open(Ljava/lang/String;)Ljava/io/InputStream;

    move-result-object p1

    .line 156
    invoke-static {p2}, Lcom/hamidyarali/ironcrown/MainActivity;->access$200(Ljava/lang/String;)Ljava/lang/String;

    move-result-object p2

    invoke-static {p2, p1}, Lcom/hamidyarali/ironcrown/MainActivity;->access$300(Ljava/lang/String;Ljava/io/InputStream;)Landroid/webkit/WebResourceResponse;

    move-result-object p1
    :try_end_0
    .catch Ljava/io/IOException; {:try_start_0 .. :try_end_0} :catch_0

    return-object p1

    .line 158
    :catch_0
    new-array p1, v1, [B

    invoke-static {v2, v4, v3, p1}, Lcom/hamidyarali/ironcrown/MainActivity;->access$100(Ljava/lang/String;ILjava/lang/String;[B)Landroid/webkit/WebResourceResponse;

    move-result-object p1

    return-object p1
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .locals 0

    .line 165
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;

    move-result-object p1

    invoke-virtual {p1}, Landroid/net/Uri;->getHost()Ljava/lang/String;

    move-result-object p1

    const-string p2, "appassets.androidplatform.net"

    invoke-virtual {p2, p1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    xor-int/lit8 p1, p1, 0x1

    return p1
.end method
