# -*- coding: utf-8 -*-
{
    'name': 'Select serial number on sales order line',
    'description': 'Select serial number on sales order line',
    'category': 'Sale',
    'summary': 'Allows to select a serial number from the specific product in sale',
    'version': '14.0.1.0.1',
    'author': 'Aktiv Software',
    'website': 'www.aktivsoftware.com',
    'depends': ['sale_management', 'purchase', 'stock', 'account', 'point_of_sale'],
    'data': [
        'views/sale_order_views.xml',
        'views/stock_production_lot_views.xml',
        'views/pos_templates.xml',
    ],
    # 'qweb': ['static/src/xml/EditListPopUp.xml'],
}
