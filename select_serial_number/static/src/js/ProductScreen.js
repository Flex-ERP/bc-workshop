odoo.define('select_serial_number.ProductLot', function(require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const ProductScreen = require('point_of_sale.ProductScreen');
    const OrderWidget = require('point_of_sale.OrderWidget');
    const ReceiptScreen = require('point_of_sale.ReceiptScreen');
    const ClientListScreen = require('point_of_sale.ClientListScreen');
    const NumberBuffer = require('point_of_sale.NumberBuffer');
    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const { posbus } = require('point_of_sale.utils');
    const { useListener } = require('web.custom_hooks');
    const { Gui } = require('point_of_sale.Gui');
    var sessionStorage = require('web.sessionStorage');
    const { useState } = owl.hooks;
    var core = require('web.core');
    var _t = core._t
    var rpc = require('web.rpc');
    var utils = require('web.utils');
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;
    var models = require('point_of_sale.models');
    const PosComponent = require('point_of_sale.PosComponent');
    const ControlButtonsMixin = require('point_of_sale.ControlButtonsMixin');
    const { onChangeOrder, useBarcodeReader } = require('point_of_sale.custom_hooks');
    const { parse } = require('web.field_utils');

    models.load_models([{
        model: 'stock.production.lot',
        fields: ['tax_ids', 'id', 'name', 'product_id', 'cost_price'],
      loaded: function(self, lots) {
          self.lot_ids = lots;
      },
    }]);

    var super_orderline_model = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
         get_all_prices: function(){
            var self = this;
            var price_unit = this.get_unit_price() * (1.0 - (this.get_discount() / 100.0));
            var custom_product_lot = sessionStorage.getItem("serial_lot_no");
            var custom_lot_price = sessionStorage.getItem("lot_cost_price");

            console.log("\n\n\n\n\n priceeeeeeeeeeeeeeeeeeeeeee unitttttttttttttttt----------/////////////////////////////////////////---------------", custom_product_lot,custom_lot_price)
            var taxtotal = 0;
            var product =  this.get_product();
            // console.log("\n\n\n\n PRODUCTTTTTTTTTTTTTTT ", product, product.selected_lot)
            var taxes =  this.pos.taxes;
            // console.log("\n\n\n\n taxes::::::::::::::::::::::::", taxes)
            var taxes_ids = _.filter(product.taxes_id, t => t in this.pos.taxes_by_id);
            // console.log("\n\n\n\n taxes_ids::::::::::::::::::::::::", taxes_ids)
            var product_lot_taxes = []
            var lot_taxes = []
            if (['serial', 'lot'].includes(product.tracking) && (this.pos.picking_type.use_create_lots || this.pos.picking_type.use_existing_lots)){
                this.pos.taxes.filter(function( item ){
                    if (self.pos.lot_ids){
                        // console.log("\n\n\n\n self.pos.lot_ids:::::::::::::::::", self.pos.lot_ids)
                        var custom_selected_lot = product.selected_lot || custom_product_lot
                        for (let i = 0; i < self.pos.lot_ids.length; i++){
                            if(custom_selected_lot){
                                if(custom_selected_lot == self.pos.lot_ids[i]['name']){
                                    // console.log("\n\n\n\n lottttttttttttt selected matchedddddd")
                                    lot_taxes.push(self.pos.lot_ids[i]['tax_ids'])
                                }
                                else{
                                    product_lot_taxes = []
                                }
                            }
                        }
                    }
                })
                console.log("\n\n\n\n lot_taxes::::::::::::::::::1111111111::::::", lot_taxes)
                if (this.pos.taxes.length > 0){
                    this.pos.taxes.filter(function( item ){
                        for (let k = 0; k < lot_taxes.length; k++){
                            for(let m = 0; m < lot_taxes[k].length; m++){
                                if(item['id'] == lot_taxes[k][m]){
                                    product_lot_taxes.push(item)
                                }
                            }
                        }
                    });
                }
                else{
                    product_lot_taxes = []
                }
            }
            console.log("*******************************************",product_lot_taxes)
            var taxdetail = {};
            var product_taxes = [];
            if (['serial', 'lot'].includes(product.tracking) && (this.pos.picking_type.use_create_lots || this.pos.picking_type.use_existing_lots)){
                const second_hand_tax = product_lot_taxes.filter(tax => tax.amount_type === 'based_on_margin')
                console.log("7777777777777777777777777777777777777777777777777777777",second_hand_tax)
                // if (second_hand_tax){
                //     price_unit = this.get_unit_price() - product.lot_selected_cost_price
                //     console.log("LLLLLLLLLLLLLLLLL$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$",price_unit)
                // }
                product_taxes = product_lot_taxes;
            }
            else{
                _(taxes_ids).each(function(el){
                    var tax = _.detect(taxes, function(t){
                        return t.id === el;
                    });
                    product_taxes.push.apply(product_taxes, self._map_tax_fiscal_position(tax, self.order));
                });

            }
            console.log("\n\n\n\n PRODUCTCCCCCCCCCCCCCC taxessssssssss uniqueeeeeeeeeeeeeeeeee", product_taxes)
            product_taxes = _.uniq(product_taxes, function(tax) { return tax.id;});
            // console.log("\n\n\n\n PRODUCTCCCCCCCCCCCCCC taxessssssssss", product_taxes)

            var all_taxes = this.compute_all(product_taxes, price_unit, this.get_quantity(), this.pos.currency.rounding);
            // console.log("\n\n\n\n all_taxes@@@@@@@@@@@@@@@@@@ taxessssssssss", all_taxes)
            // console.log("\n\n\n\n all_taxes_before_discount@@@@@@@@@@@@@@@@@@ taxessssssssss", all_taxes_before_discount)
            var all_taxes_before_discount = this.compute_all(product_taxes, 
                this.get_unit_price(), this.get_quantity(), this.pos.currency.rounding);
            var amount = 0
            _(all_taxes.taxes).each(function(tax) {
                console.log("&SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS",custom_lot_price,tax.base,tax)
                if (tax.name === 'Sale(Second Hand)'){
                        var new_price = tax.base - custom_lot_price
                        amount = (new_price * 20) / 100
                        console.log("0000000000000000000000000000000000---------------------------------------",amount)
                    }
                else{
                    amount = tax.amount
                }
                taxtotal += amount;
                taxdetail[tax.id] = tax.amount;
            });
            return {
                "priceWithTax": all_taxes.total_included,
                "priceWithoutTax": all_taxes.total_excluded,
                "priceSumTaxVoid": all_taxes.total_void,
                "priceWithTaxBeforeDiscount": all_taxes_before_discount.total_included,
                "tax": taxtotal,
                "taxDetails": taxdetail,
            };
        },
        _compute_all: function(tax, base_amount, quantity, price_exclude) {
            if(price_exclude === undefined)
                var price_include = tax.price_include;
            else
                var price_include = !price_exclude;
            if (tax.amount_type === 'fixed') {
                var sign_base_amount = Math.sign(base_amount) || 1;
                // Since base amount has been computed with quantity
                // we take the abs of quantity
                // Same logic as bb72dea98de4dae8f59e397f232a0636411d37ce
                return tax.amount * sign_base_amount * Math.abs(quantity);
            }
            var product = this.get_product();
            var custom_lot_price = sessionStorage.getItem("lot_cost_price");
            if ((tax.amount_type === 'based_on_margin') && !price_include){
                var price = base_amount - custom_lot_price || 0
                var final_price = price * tax.amount / 100
                return final_price;
            }
            // if ((tax.amount_type === 'based_on_margin') && price_include){
            //     return base_amount - (base_amount / (1 + tax.amount / 100));
            // }
            if ((tax.amount_type === 'percent' || tax.amount_type === 'based_on_margin') && !price_include){
                if ((tax.amount_type === 'based_on_margin') && !price_include){
                    var price = base_amount - custom_lot_price || 0
                    var final_price = price * tax.amount / 100
                    return final_price;
                }
                else{
                    return base_amount * tax.amount / 100;
                }
            }
            if ((tax.amount_type === 'percent') && price_include){
                return base_amount - (base_amount / (1 + tax.amount / 100));
            }
            if (tax.amount_type === 'division' && !price_include) {
                return base_amount / (1 - tax.amount / 100) - base_amount;
            }
            if (tax.amount_type === 'division' && price_include) {
                return base_amount - (base_amount * (tax.amount / 100));
            }
            return false;
        },
    });

    const OrderWidgetCustom = (OrderWidget) =>
    class extends OrderWidget {
        async _editPackLotLines(event) {
            const orderline = event.detail.orderline;
            const isAllowOnlyOneLot = orderline.product.isAllowOnlyOneLot();
            const packLotLinesToEdit = orderline.getPackLotLinesToEdit(isAllowOnlyOneLot);
            const { confirmed, payload } = await this.showPopup('EditListPopup', {
                title: this.env._t('Lot/Serial Number(s) Required'),
                isSingleItem: isAllowOnlyOneLot,
                array: packLotLinesToEdit,
            });
            if (confirmed) {
                // Segregate the old and new packlot lines
                orderline.product.selected_lot = payload.newArray.filter(item => item.id)[0]['text']

                const data = await this._check_lot_number(orderline.product['id'], payload);
                if (data){
                    const modifiedPackLotLines = Object.fromEntries(
                        payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                    );
                    const newPackLotLines = payload.newArray
                        .filter(item => !item.id)
                        .map(item => ({ lot_name: item.text }));

                    orderline.setPackLotLines({ modifiedPackLotLines, newPackLotLines });
                }
            }
            this.order.select_orderline(event.detail.orderline);
        }
        async _check_lot_number(product, payload) {
            let data, msg;
            const serial_lot_name = payload.newArray.filter(item => item.id)
            var self = this
            if (product && serial_lot_name[0]['text']) {
                return rpc.query({
                    model : "stock.production.lot",
                    method : "get_lot_taxes",
                    args : [[],[product],[serial_lot_name[0]['text']]],
                }).then(function(data){
                    if(data[0]['msg']) {
                        self.showPopup('ErrorPopup', {
                            title: self.env._t('Validation Error'),
                            body: self.env._t(data[0]['msg']),
                        });
                        return;
                    }
                    else{
                        window.lots_taxes = data
                        self.env.pos['lots_taxes'] = data
                        return data;
                    }
                });
            }

        }
    }

    const PosCustomLotPopUp = (ProductScreen) =>
    class extends ProductScreen {
        _setValue(val) {
            if (this.currentOrder.get_selected_orderline()) {
                if (this.state.numpadMode === 'quantity') {
                    var self = this
                    var product_tracking = this.currentOrder.get_selected_orderline().product.tracking
                    if (val && val != 'remove') {
                        if ((product_tracking == 'lot' || product_tracking == 'serial') && (val > 1 || val == 0)) {
                            // console.log("\n\n\n\n NOTTTTTTTTT possibleeeeeeeeeeee")
                            this.showPopup('ErrorPopup', {
                                title: self.env._t('Validation Error'),
                                body: self.env._t('You cannot enter quantity greater than 1 or less than 1.'),
                            });
                            return;
                        }
                        else {
                            this.currentOrder.get_selected_orderline().set_quantity(val);
                        }
                    } else {
                        this.currentOrder.get_selected_orderline().set_quantity(val);
                    }
                } else if (this.state.numpadMode === 'discount') {
                    this.currentOrder.get_selected_orderline().set_discount(val);
                } else if (this.state.numpadMode === 'price') {
                    var selected_orderline = this.currentOrder.get_selected_orderline();
                    selected_orderline.price_manually_set = true;
                    selected_orderline.set_unit_price(val);
                }
                if (this.env.pos.config.iface_customer_facing_display) {
                    this.env.pos.send_current_order_to_customer_facing_display();
                }
            }
        }
        async _getAddProductOptions(product) {
            let price_extra = 0.0;
            let draftPackLotLines, weight, description, packLotLinesToEdit;

            if (this.env.pos.config.product_configurator && _.some(product.attribute_line_ids, (id) => id in this.env.pos.attributes_by_ptal_id)) {
                let attributes = _.map(product.attribute_line_ids, (id) => this.env.pos.attributes_by_ptal_id[id])
                                  .filter((attr) => attr !== undefined);
                let { confirmed, payload } = await this.showPopup('ProductConfiguratorPopup', {
                    product: product,
                    attributes: attributes,
                });

                if (confirmed) {
                    description = payload.selected_attributes.join(', ');
                    price_extra += payload.price_extra;
                } else {
                    return;
                }
            }

            // Gather lot information if required.
            if (['serial', 'lot'].includes(product.tracking) && (this.env.pos.picking_type.use_create_lots || this.env.pos.picking_type.use_existing_lots)) {
                const isAllowOnlyOneLot = product.isAllowOnlyOneLot();
                if (isAllowOnlyOneLot) {
                    packLotLinesToEdit = [];
                } else {
                    const orderline = this.currentOrder
                        .get_orderlines()
                        .filter(line => !line.get_discount())
                        .find(line => line.product.id === product.id);
                    if (orderline) {
                        packLotLinesToEdit = orderline.getPackLotLinesToEdit();
                    } else {
                        packLotLinesToEdit = [];
                    }
                }
                const { confirmed, payload } = await this.showPopup('EditListPopup', {
                    title: this.env._t('Lot/Serial Number(s) Required'),
                    isSingleItem: isAllowOnlyOneLot,
                    array: packLotLinesToEdit,
                });
                if (confirmed) {
                    // Segregate the old and new packlot lines
                    var serial_lot_no = payload.newArray.filter(item => !item.id)[0]['text'];
                    sessionStorage.setItem("serial_lot_no", serial_lot_no);
                    var custom_product_lot = sessionStorage.getItem("serial_lot_no");
                    product.selected_lot = payload.newArray.filter(item => !item.id)[0]['text']
                    const selected_lot_cost_price = await this.selected_lot_cost_price(product, product.selected_lot);
                    sessionStorage.setItem("lot_cost_price", selected_lot_cost_price);
                    var custom_lot_price = sessionStorage.getItem("lot_cost_price");
                    product.lot_selected_cost_price = selected_lot_cost_price
                    const data = await this._check_lot_number(product, payload);
                    if (data){
                        const modifiedPackLotLines = Object.fromEntries(
                            payload.newArray.filter(item => item.id).map(item => [item.id, item.text])
                        );
                        const newPackLotLines = payload.newArray
                            .filter(item => !item.id)
                            .map(item => ({ lot_name: item.text }));

                        draftPackLotLines = { modifiedPackLotLines, newPackLotLines };
                    } else {
                        // We don't proceed on adding product.
                        return;
                    }
                } else {
                    // We don't proceed on adding product.
                    return;
                }
            }

            // Take the weight if necessary.
            if (product.to_weight && this.env.pos.config.iface_electronic_scale) {
                // Show the ScaleScreen to weigh the product.
                if (this.isScaleAvailable) {
                    const { confirmed, payload } = await this.showTempScreen('ScaleScreen', {
                        product,
                    });
                    if (confirmed) {
                        weight = payload.weight;
                    } else {
                        // do not add the product;
                        return;
                    }
                } else {
                    await this._onScaleNotAvailable();
                }
            }

            return { draftPackLotLines, quantity: weight, description, price_extra };
        }
        async selected_lot_cost_price(product, lot) {
            let cost_price;
            // const serial_lot_name = payload.newArray
            //     .filter(item => !item.id)
            var self = this
            if (product['id'] && lot) {
                return rpc.query({
                    model : "stock.production.lot",
                    method : "lot_cost_price",
                    args : [[],[product['id']],[lot]],
                }).then(function(data){
                });
            }

        }
        async _check_lot_number(product, payload) {
            let data, msg;
            const serial_lot_name = payload.newArray
                .filter(item => !item.id)
            var self = this
            if (product['id'] && serial_lot_name[0]['text']) {
                return rpc.query({
                    model : "stock.production.lot",
                    method : "get_lot_taxes",
                    args : [[],[product['id']],[serial_lot_name[0]['text']]],
                }).then(function(data){
                    if(data[0]['msg']) {
                        self.showPopup('ErrorPopup', {
                            title: self.env._t('Validation Error'),
                            body: self.env._t(data[0]['msg']),
                        });
                        return;
                    }
                    else{
                        window.lots_taxes = data
                        self.env.pos['lots_taxes'] = data
                        return data;
                    }
                });
            }

        }
       }
    Registries.Component.extend(ProductScreen, PosCustomLotPopUp);
    Registries.Component.extend(OrderWidget, OrderWidgetCustom);
    return PosCustomLotPopUp,OrderWidgetCustom;
});
