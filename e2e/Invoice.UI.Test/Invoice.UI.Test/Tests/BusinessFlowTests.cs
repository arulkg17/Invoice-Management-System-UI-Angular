using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

/// <summary>
/// ONE story told from the screen, in order. Every step uses the data created by the steps before it:
///
///   category -> item, vendor, customer
///   purchase order: create (Draft) -> edit -> verify PDF + approve -> read only
///   receipt:        create -> post                         => stock 10
///   sales invoice:  create -> post                         => stock 7
///   rules:          oversell is rejected, used masters cannot be deleted
///   cancel:         invoice, then receipt                  => stock back to 10, then 0
///
/// If a step fails, the later steps are SKIPPED (not failed), so the first red test is the real problem.
/// Every run creates its own uniquely named data, so the test can be repeated on the same database.
/// </summary>
[TestFixture]
[NonParallelizable]
public class BusinessFlowTests : UiTest
{
    private readonly CategoryData _category = TestData.Category();
    private readonly ItemData _item = TestData.Item();
    private readonly PartyData _vendor = TestData.Vendor();
    private readonly PartyData _customer = TestData.Customer();
    private readonly string _poNumber = TestData.PoNumber();
    private readonly string _receiptNumber = TestData.ReceiptNumber();
    private readonly string _invoiceNumber = TestData.InvoiceNumber();
    private readonly string _bigInvoiceNumber = TestData.InvoiceNumber();

    // Set to true by the step that completes; the next steps check it.
    private static readonly HashSet<string> Done = new();
    private static string _runId = "";

    [OneTimeSetUp]
    public void NewRun()
    {
        Done.Clear();
        _runId = TestData.Token(4);
    }

    private static void Require(string previousStep) =>
        Assume.That(Done.Contains(previousStep), Is.True, $"Skipped because the step '{previousStep}' did not pass.");

    private static void Finished(string step) => Done.Add(step);

    // ===================================================================== masters

    [Test, Order(1)]
    public async Task S01_create_the_category()
    {
        await new CategoriesPage(Page).CreateAsync(_category);
        Finished(nameof(S01_create_the_category));
    }

    [Test, Order(2)]
    public async Task S02_create_the_item_in_that_category()
    {
        Require(nameof(S01_create_the_category));

        var items = new ItemsPage(Page);
        await items.CreateAsync(_item, _category.Code);
        await items.FindAsync(_item.Name);

        Finished(nameof(S02_create_the_item_in_that_category));
    }

    [Test, Order(3)]
    public async Task S03_create_the_vendor()
    {
        await new VendorsPage(Page).CreateAsync(_vendor);
        Finished(nameof(S03_create_the_vendor));
    }

    [Test, Order(4)]
    public async Task S04_create_the_customer()
    {
        await new CustomersPage(Page).CreateAsync(_customer);
        Finished(nameof(S04_create_the_customer));
    }

    // ===================================================================== purchase order

    [Test, Order(10)]
    public async Task S10_create_a_purchase_order_it_starts_as_Draft_and_a_PDF_is_shown_to_verify()
    {
        Require(nameof(S02_create_the_item_in_that_category));
        Require(nameof(S03_create_the_vendor));

        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new PurchaseOrderForm(Page);
        await form.SetNumberAsync(_poNumber);
        await form.ChooseVendorAsync(_vendor.Code);
        await form.Lines.SetAsync(0, _item.Code, quantity: 10, rate: 100, discount: 0, taxPercent: 18);

        // 10 x 100 = 1000, plus 18 % tax = 1,180.00 (the screen shows it before the server recalculates)
        await Expect(form.GrandTotal).ToHaveTextAsync("1,180.00");

        await form.SaveAsync();
        await Page.ClosePdfPreviewAsync($"Verify {_poNumber}");

        await Expect(Page).ToHaveURLAsync(new Regex("/transactions/po$"));
        await list.FindAsync(_poNumber);
        await list.ExpectStatusAsync(_poNumber, "Draft");

        Finished(nameof(S10_create_a_purchase_order_it_starts_as_Draft_and_a_PDF_is_shown_to_verify));
    }

    [Test, Order(11)]
    public async Task S11_a_Draft_purchase_order_can_be_edited()
    {
        Require(nameof(S10_create_a_purchase_order_it_starts_as_Draft_and_a_PDF_is_shown_to_verify));

        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_poNumber);
        await list.ClickActionAsync(_poNumber, "edit");

        var form = new PurchaseOrderForm(Page);
        await Expect(form.Heading).ToHaveTextAsync("Edit Purchase Order");
        await Expect(form.Field("PO Number")).ToHaveValueAsync(_poNumber);

        await form.SetNotesAsync("Edited by Playwright " + _runId);
        await form.SaveAsync();
        await Page.ClosePdfPreviewAsync($"Verify {_poNumber}");

        await Expect(Page).ToHaveURLAsync(new Regex("/transactions/po$"));
        Finished(nameof(S11_a_Draft_purchase_order_can_be_edited));
    }

    [Test, Order(12)]
    public async Task S12_verify_the_PDF_and_approve_the_purchase_order()
    {
        Require(nameof(S11_a_Draft_purchase_order_can_be_edited));

        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_poNumber);

        await list.ClickActionAsync(_poNumber, "fact_check");               // "Verify PDF & Approve"
        await Page.ApproveInPdfPreviewAsync($"Verify {_poNumber}");

        await list.ExpectStatusAsync(_poNumber, "Approved");
        await list.ExpectActionAsync(_poNumber, "fact_check", visible: false);   // nothing left to approve
        await list.ExpectActionAsync(_poNumber, "delete", visible: false);       // an approved PO cannot be deleted

        Finished(nameof(S12_verify_the_PDF_and_approve_the_purchase_order));
    }

    [Test, Order(13)]
    public async Task S13_an_Approved_purchase_order_is_read_only()
    {
        Require(nameof(S12_verify_the_PDF_and_approve_the_purchase_order));

        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_poNumber);
        await list.ClickActionAsync(_poNumber, "visibility");

        var form = new PurchaseOrderForm(Page);
        await Expect(form.Heading).ToHaveTextAsync("View Purchase Order");
        await Expect(form.Banner).ToContainTextAsync("read only");
        await Expect(form.SaveButton).ToHaveCountAsync(0);
        await Expect(Page.GetByRole(AriaRole.Button, new() { Name = "Cancel PO" })).ToBeVisibleAsync();   // approved POs can still be cancelled
    }

    // ===================================================================== receipt (goods in)

    [Test, Order(20)]
    public async Task S20_create_a_receipt_for_the_approved_order()
    {
        Require(nameof(S12_verify_the_PDF_and_approve_the_purchase_order));

        var list = new ReceiptsPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new ReceiptForm(Page);
        await form.SetNumberAsync(_receiptNumber);
        await form.ChoosePurchaseOrderAsync(_poNumber);     // lines appear, "Receive now" = the outstanding 10
        await form.SaveAsync();
        await Page.ClosePdfPreviewAsync("Goods Receipt");

        await Expect(Page).ToHaveURLAsync(new Regex("/transactions/receipt$"));
        await list.FindAsync(_receiptNumber);
        await list.ExpectStatusAsync(_receiptNumber, "Draft");

        Finished(nameof(S20_create_a_receipt_for_the_approved_order));
    }

    [Test, Order(21)]
    public async Task S21_posting_the_receipt_adds_the_goods_to_stock()
    {
        Require(nameof(S20_create_a_receipt_for_the_approved_order));

        var list = new ReceiptsPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_receiptNumber);

        await list.ClickActionAsync(_receiptNumber, "check_circle");
        await Page.ConfirmAsync("Post", "Post Receipt");

        await list.ExpectStatusAsync(_receiptNumber, "Posted");
        await list.ExpectActionAsync(_receiptNumber, "delete", visible: false);   // posted receipts cannot be deleted

        await new StockPage(Page).ExpectOnHandAsync(_item.Code, 10);

        Finished(nameof(S21_posting_the_receipt_adds_the_goods_to_stock));
    }

    [Test, Order(22)]
    public async Task S22_the_purchase_order_is_no_longer_just_Approved()
    {
        Require(nameof(S21_posting_the_receipt_adds_the_goods_to_stock));

        var list = new PurchaseOrdersPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_poNumber);

        await Expect(list.StatusBadge(_poNumber)).Not.ToHaveTextAsync("Approved");
    }

    // ===================================================================== sales invoice (goods out)

    [Test, Order(30)]
    public async Task S30_create_a_sales_invoice_for_3_pieces()
    {
        Require(nameof(S21_posting_the_receipt_adds_the_goods_to_stock));
        Require(nameof(S04_create_the_customer));

        var list = new SalesInvoicesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new SalesInvoiceForm(Page);
        await form.SetNumberAsync(_invoiceNumber);
        await form.ChooseCustomerAsync(_customer.Code);
        await form.Lines.SetAsync(0, _item.Code, quantity: 3, rate: 150, discount: 0, taxPercent: 18);
        await form.SaveAsync();
        await Page.ClosePdfPreviewAsync("Sales Invoice");

        await Expect(Page).ToHaveURLAsync(new Regex("/transactions/sales-invoice$"));
        await list.FindAsync(_invoiceNumber);
        await list.ExpectStatusAsync(_invoiceNumber, "Draft");

        Finished(nameof(S30_create_a_sales_invoice_for_3_pieces));
    }

    [Test, Order(31)]
    public async Task S31_posting_the_invoice_reduces_the_stock()
    {
        Require(nameof(S30_create_a_sales_invoice_for_3_pieces));

        var list = new SalesInvoicesPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_invoiceNumber);

        await list.ClickActionAsync(_invoiceNumber, "check_circle");
        await Page.ConfirmAsync("Post", "Post Sales Invoice");

        await list.ExpectStatusAsync(_invoiceNumber, "Posted");
        await new StockPage(Page).ExpectOnHandAsync(_item.Code, 7);

        Finished(nameof(S31_posting_the_invoice_reduces_the_stock));
    }

    [Test, Order(32)]
    public async Task S32_an_invoice_for_more_than_the_stock_cannot_be_posted()
    {
        Require(nameof(S31_posting_the_invoice_reduces_the_stock));

        var list = new SalesInvoicesPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        var form = new SalesInvoiceForm(Page);
        await form.SetNumberAsync(_bigInvoiceNumber);
        await form.ChooseCustomerAsync(_customer.Code);
        await form.Lines.SetAsync(0, _item.Code, quantity: 500, rate: 150, taxPercent: 18);   // only 7 on hand
        await form.SaveAsync();
        await Page.ClosePdfPreviewAsync("Sales Invoice");

        await list.FindAsync(_bigInvoiceNumber);
        await list.ClickActionAsync(_bigInvoiceNumber, "check_circle");
        await Page.ConfirmAsync("Post", "Post Sales Invoice");

        await Page.ExpectToastAsync(new Regex("insufficient|not enough|available", RegexOptions.IgnoreCase));
        await list.ExpectStatusAsync(_bigInvoiceNumber, "Draft");     // still Draft
        await new StockPage(Page).ExpectOnHandAsync(_item.Code, 7);   // stock untouched

        // a Draft invoice can be deleted
        await list.OpenAsync();
        await list.FindAsync(_bigInvoiceNumber);
        await list.ClickActionAsync(_bigInvoiceNumber, "delete");
        await Page.ConfirmAsync("Delete");
        await Expect(list.Row(_bigInvoiceNumber)).ToHaveCountAsync(0);
    }

    // ===================================================================== business rules (Invoice.CqrsAPI)

    [Test, Order(40), Category("CqrsRules")]
    public async Task S40_a_category_with_active_items_cannot_be_deleted()
    {
        Require(nameof(S02_create_the_item_in_that_category));

        var categories = new CategoriesPage(Page);
        await categories.OpenAsync();
        await categories.FindAsync(_category.Code);
        await categories.DeleteAsync(_category.Code);

        await Page.ExpectToastAsync("cannot be deleted");
        await Expect(categories.Row(_category.Code)).ToBeVisibleAsync();
    }

    [Test, Order(41), Category("CqrsRules")]
    public async Task S41_a_customer_with_invoices_cannot_be_deleted()
    {
        Require(nameof(S30_create_a_sales_invoice_for_3_pieces));

        var customers = new CustomersPage(Page);
        await customers.OpenAsync();
        await customers.FindAsync(_customer.Code);
        await customers.DeleteAsync(_customer.Code);

        await Page.ExpectToastAsync("cannot be deleted");
        await Expect(customers.Row(_customer.Code)).ToBeVisibleAsync();
    }

    [Test, Order(42), Category("CqrsRules")]
    public async Task S42_a_vendor_with_purchase_orders_cannot_be_deleted()
    {
        Require(nameof(S10_create_a_purchase_order_it_starts_as_Draft_and_a_PDF_is_shown_to_verify));

        var vendors = new VendorsPage(Page);
        await vendors.OpenAsync();
        await vendors.FindAsync(_vendor.Code);
        await vendors.DeleteAsync(_vendor.Code);

        await Page.ExpectToastAsync("cannot be deleted");
        await Expect(vendors.Row(_vendor.Code)).ToBeVisibleAsync();
    }

    [Test, Order(43), Category("CqrsRules")]
    public async Task S43_an_item_with_stock_cannot_be_deleted()
    {
        Require(nameof(S31_posting_the_invoice_reduces_the_stock));

        var items = new ItemsPage(Page);
        await items.OpenAsync();
        await items.FindAsync(_item.Name);
        await items.DeleteAsync(_item.Name);

        await Page.ExpectToastAsync("Item delete error");      // the item screen shows its own generic message
        await Expect(items.Row(_item.Name)).ToBeVisibleAsync();
    }

    // ===================================================================== cancel

    [Test, Order(50)]
    public async Task S50_cancelling_the_posted_invoice_puts_the_goods_back()
    {
        Require(nameof(S31_posting_the_invoice_reduces_the_stock));

        var list = new SalesInvoicesPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_invoiceNumber);

        await list.ClickActionAsync(_invoiceNumber, "block");
        await Page.ConfirmAsync("Cancel Invoice", "Cancel Sales Invoice");

        await list.ExpectStatusAsync(_invoiceNumber, "Cancelled");
        await new StockPage(Page).ExpectOnHandAsync(_item.Code, 10);

        Finished(nameof(S50_cancelling_the_posted_invoice_puts_the_goods_back));
    }

    [Test, Order(51)]
    public async Task S51_cancelling_the_posted_receipt_takes_the_goods_out_again()
    {
        Require(nameof(S50_cancelling_the_posted_invoice_puts_the_goods_back));

        var list = new ReceiptsPage(Page);
        await list.OpenAsync();
        await list.FindAsync(_receiptNumber);

        await list.ClickActionAsync(_receiptNumber, "block");
        await Page.ConfirmAsync("Cancel Receipt", "Cancel Receipt");

        await list.ExpectStatusAsync(_receiptNumber, "Cancelled");
        await new StockPage(Page).ExpectOnHandAsync(_item.Code, 0);
    }
}
