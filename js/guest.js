$( function(){

var guestApp = {};


guestApp.Contact = Backbone.Model.extend({
    defaults:{
        name:'',
        email:'',
        selected:false
    },

    toggle: function(){
        this.set({
            selected: !this.get('seleted')
        });
    }
});

var ContactList = Backbone.Collection.extend({
    model: guestApp.Contact,

    // Filter down the list of selected contacts
    selectedContacts: function(){
        return this.filter(function(contact){
            return contact.get('selected');
        });
    }

});


guestApp.contacts = new ContactList([
    { name:'test',
    email:'test@test.com'
    },
    { name:'John Doe',
    email:'john.doe@test.com'
    },
    { name:'Jane Doe',
    email:'jane.doe@test.com'
    },
    { name:'Richard Roe',
    email:'richard@test.com'
    },
    { name:'Mary Roe',
    email:'mary.roe@test.com'
    }
]);


guestApp.ContactView = Backbone.View.extend({

    tagName:'li',

    template: _.template($('#contact_template').html()),

    events:{
        'click .toggle':'select'
    },

    initialize: function(){
        this.$el.addClass('clearfix');
        this.listenTo(this.model,'change', this.render);
    },

    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    },

    select: function(){
        this.model.toggle();
    }
});


// Create a view class for user input.
guestApp.AppView = Backbone.View.extend({
    el:'#panel',

    events:{
        'click #btn-input':'addGuests',
        'click .tab':'changeTab',
        'click #toggle-all':'toggleAllContacts'
    },

    initialize:function(){
        this.$input = this.$('#manual');
        this.$contact = this.$('#contact');
        this.$tabs = this.$('.tab');
        this.allCheckbox = this.$('#toggle-all')[0]; //Get #toggle-all dom
        this.$contactList = this.$('#contact_list');

        this.listenTo(guestApp.contacts,'reset', this.addContacts);
        this.render();
    },

    render:function(){
        this.addContacts();
        return this;
    },

    addGuests:function(){

        if(!this.$input.hasClass('none')){
            this.processInput();
        }else{
            var contacts = guestApp.contacts.selectedContacts();

            _.each(contacts, this.addGuestFromContact, this);
        }
    },

    processInput:function(){
        var input = this.$input.val(),
            inputLists;

        inputLists = input.split(/[\r\n|\r|\n|,|;]/g);

        _.each(inputLists, this.addGuestFromInput,this);

    },

    addGuestFromInput:function(info){
        var infos,name,email;

        try{
            infos = info.trim().split('<');
            name = infos[0].trim();
            email = infos[1].trim().replace(/>$/,'');
        }catch(err){
            //alert('Input guests informatin error');
            return false;
        }
        this.addGuest(this.createGuest(name,email,true));
    },

    addGuestFromContact: function(contact){
        var name = contact.get('name'),
            email = contact.get('email');

        this.addGuest(this.createGuest(name,email,false));
    },

    addGuest: function(guest){
        if(guestApp.guests.contain(guest.email))
            return false;

        guestApp.guests.create(guest,{validate:true});
    },

    createGuest: function(name, email, editable){
        return {
            name: name,
            email:email,
            editable: editable
        };
    },

    changeTab: function(e){
        var $tab = $(e.target),
            content = $tab.attr('data');

        this.$input.addClass('none');
        this.$contact.addClass('none')
        this.$tabs.removeClass('highlight');
        $tab.addClass('highlight');
        $(content).removeClass('none');
    },

    addContact : function(contact){
        //debugger;
        var view = new guestApp.ContactView({model:contact});
        this.$contactList.append(view.render().el);
    },

    addContacts: function(){
        this.$contactList.html('');
        guestApp.contacts.each(this.addContact,this);
    },

    toggleAllContacts: function(){
        var selected = this.allCheckbox.checked;

        guestApp.contacts.each(function(contact){
            contact.set({
                'selected':selected
            });
        });
    }

});

/*********************************************************/

// guest model has 'name', 'email' ,'editable' options

guestApp.Guest = Backbone.Model.extend({
    defaults:{
        name:'',
        email:'',
        editable: true
    },

    validate: function(attrs, options){
        if( _.isEmpty(attrs.name)){
            return [".name","Please input valid guest name."]
        }

        if( _.isEmpty(attrs.email) || !this.isEmail(attrs.email)){
            return [".email","Please input valid email address."];
        }
    },
    
    isEmail: function(email){
        var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
        return emailReg.test(email);
    }
    
});


// Create guest list collection

var GuestList = Backbone.Collection.extend({
    model: guestApp.Guest,

    localStorage: new Backbone.LocalStorage('guestbooks'),

    emails: {},

    addEmail: function(email){
        this.emails[email] = 1;
    },

    removeEmail: function(email){
        // but remains undefined item.
        delete this.emails[email];
    },

    contain: function(email){
        return _.has(this.emails, email);
    }

});

guestApp.guests = new GuestList();



guestApp.GuestView = Backbone.View.extend({
    tagName:'li',

    template: _.template($('#guest_template').html()),

    attributess:{
        class:'clearfix view'
    },

    events:{
        'click .btn-edit':'edit',
        'click .btn-save':'save',
        'click .btn-del':'clear',
    },

    initialize: function(){
        this.listenTo(this.model,'change', this.render);
        this.listenTo(this.model,'destroy', this.remove);
        this.listenTo(this.model,'invalid', this.showError);
        this.$el.addClass('clearfix');

    },

    render: function(){
        this.$el.html(this.template(this.model.toJSON()));
        this.$name = this.$('.name');
        this.$email = this.$('.email');
        this.$edit = this.$('.btn-edit');
        return this;
    },

    // Allow edit name and email. name and email input become editable
    // edit button become save button
    edit: function(){
        this.$el.addClass('editing');
        this.$edit.html('Save').toggleClass('btn-edit btn-save');
        this.$name.focus();
    },

    // Store edited value. 
    save: function(){

        // If save fails, it will return false, otherwise return itself.
        var name = this.$name.val().trim(),
            email = this.$email.val().trim(),
            info = {name:name,email:email},
            oldEmail = this.model.get('email');

        if( email!== oldEmail && guestApp.guests.contain(email)){
            this.$email.focus();
            return false;
        }

        if(this.model.save(info, {validate:true})){
            this.$el.removeClass('editing');
            this.$edit.html('Edit').toggleClass('btn-edit btn-save');

            guestApp.guests.remove(oldEmail);   
            return true;
        } 
        return false;
    },

    showError:function(model, error){
        var target = error[0];
        this.$(target).focus();
    },

    // Delete this guest
    clear: function(){
        this.model.destroy();
    }
});


guestApp.GuestListView = Backbone.View.extend({
    el: '#guest',

    initialize: function(){
        this.$number = this.$('#number');
        this.$list = this.$('#guest_list');

        this.listenTo(guestApp.guests,'add', this.addOne);
        this.listenTo(guestApp.guests,'reset', this.addAll);
        this.listenTo(guestApp.guests,'all', this.render);
        this.listenTo(guestApp.guests,'remove', this.removeOne);

        guestApp.guests.fetch();
        this.render();
    },

    render:function(){
        this.update();
        return this;
    },
    
    addOne:function(guest){
        // add a guest View
        var view = new guestApp.GuestView({model:guest});
        this.$list.append(view.render().el);

        guestApp.guests.addEmail(guest.get('email'));
    },

    addAll:function(){
        this.$list.html('');
        guestApp.guests.each(this.addOne, this);
    },

    update:function(){
        this.$number.html(guestApp.guests.length);
    },

    removeOne:function(guest){
        guestApp.guests.removeEmail(guest.get('email'));
    }

});


var app = new guestApp.AppView(),
    list = new guestApp.GuestListView();

});
