using Invoice.UI.Tests.Pages;
using Invoice.UI.Tests.Support;

namespace Invoice.UI.Tests.Tests;

[TestFixture]
public class CustomerTests : UiTest
{
    [Test]
    public async Task Create_search_edit_and_delete_a_customer()
    {
        var data = TestData.Customer();
        var list = new CustomersPage(Page);

        await list.CreateAsync(data);
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(data.Name);

        // edit
        await list.EditAsync(data.Code);
        var form = new PartyForm(Page, "Customer");
        await Expect(form.Code).ToHaveValueAsync(data.Code);
        var newName = "Ren " + TestData.Token(5);
        await form.Name.FillAsync(newName);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Customer updated successfully");
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(newName);

        // delete
        await list.DeleteAsync(data.Code);
        await Page.ExpectToastAsync($"{newName} deleted");
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);
    }

    [Test]
    public async Task Required_fields_are_checked()
    {
        var list = new CustomersPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        await new PartyForm(Page, "Customer").SaveAsync();

        await Expect(Page.GetByText("Code is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Name is required")).ToBeVisibleAsync();
    }

    [Test]
    public async Task The_city_filter_finds_the_new_customer()
    {
        var data = TestData.Customer();
        var list = new CustomersPage(Page);
        await list.CreateAsync(data);

        await list.FilterTextAsync("Code", data.Code);
        await list.FilterTextAsync("City", data.City);

        await Expect(list.Row(data.Code)).ToBeVisibleAsync();

        await list.FilterTextAsync("City", "NoSuchCity" + TestData.Token(4));
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);
    }
}

[TestFixture]
public class VendorTests : UiTest
{
    [Test]
    public async Task Create_search_edit_and_delete_a_vendor()
    {
        var data = TestData.Vendor();
        var list = new VendorsPage(Page);

        await list.CreateAsync(data);
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(data.Name);

        await list.EditAsync(data.Code);
        var form = new PartyForm(Page, "Vendor");
        await Expect(form.Code).ToHaveValueAsync(data.Code);
        var newName = "Ren " + TestData.Token(5);
        await form.Name.FillAsync(newName);
        await form.SaveAsync();

        await Page.ExpectToastAsync("Vendor updated successfully");
        await list.FindAsync(data.Code);
        await Expect(list.Row(data.Code)).ToContainTextAsync(newName);

        await list.DeleteAsync(data.Code);
        await Page.ExpectToastAsync($"{newName} deleted");
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);
    }

    [Test]
    public async Task Required_fields_are_checked()
    {
        var list = new VendorsPage(Page);
        await list.OpenAsync();
        await list.AddAsync();

        await new PartyForm(Page, "Vendor").SaveAsync();

        await Expect(Page.GetByText("Code is required")).ToBeVisibleAsync();
        await Expect(Page.GetByText("Name is required")).ToBeVisibleAsync();
    }

    [Test]
    public async Task The_status_filter_separates_active_and_inactive_vendors()
    {
        var data = TestData.Vendor();
        var list = new VendorsPage(Page);
        await list.CreateAsync(data, active: false);

        await list.SearchAsync(data.Code);
        await list.FilterStatusAsync("Active");
        await Expect(list.Row(data.Code)).ToHaveCountAsync(0);

        await list.FilterStatusAsync("Inactive");
        await Expect(list.Row(data.Code)).ToBeVisibleAsync();

        await list.DeleteAsync(data.Code);
    }
}
