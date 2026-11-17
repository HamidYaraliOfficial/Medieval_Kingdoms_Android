.class Lcom/hamidyarali/ironcrown/MainActivity$1;
.super Ljava/lang/Object;
.source "MainActivity.java"

# interfaces
.implements Landroid/webkit/ValueCallback;


# annotations
.annotation system Ldalvik/annotation/EnclosingMethod;
    value = Lcom/hamidyarali/ironcrown/MainActivity;->onBackPressed()V
.end annotation

.annotation system Ldalvik/annotation/InnerClass;
    accessFlags = 0x0
    name = null
.end annotation

.annotation system Ldalvik/annotation/Signature;
    value = {
        "Ljava/lang/Object;",
        "Landroid/webkit/ValueCallback<",
        "Ljava/lang/String;",
        ">;"
    }
.end annotation


# instance fields
.field final synthetic this$0:Lcom/hamidyarali/ironcrown/MainActivity;


# direct methods
.method constructor <init>(Lcom/hamidyarali/ironcrown/MainActivity;)V
    .locals 0

    .line 95
    iput-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity$1;->this$0:Lcom/hamidyarali/ironcrown/MainActivity;

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    return-void
.end method


# virtual methods
.method public bridge synthetic onReceiveValue(Ljava/lang/Object;)V
    .locals 0

    .line 95
    check-cast p1, Ljava/lang/String;

    invoke-virtual {p0, p1}, Lcom/hamidyarali/ironcrown/MainActivity$1;->onReceiveValue(Ljava/lang/String;)V

    return-void
.end method

.method public onReceiveValue(Ljava/lang/String;)V
    .locals 1

    if-eqz p1, :cond_0

    .line 99
    const-string v0, "exit"

    invoke-virtual {p1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_0

    const-string v0, "null"

    invoke-virtual {p1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result p1

    if-eqz p1, :cond_1

    .line 100
    :cond_0
    iget-object p1, p0, Lcom/hamidyarali/ironcrown/MainActivity$1;->this$0:Lcom/hamidyarali/ironcrown/MainActivity;

    invoke-virtual {p1}, Lcom/hamidyarali/ironcrown/MainActivity;->finish()V

    :cond_1
    return-void
.end method
