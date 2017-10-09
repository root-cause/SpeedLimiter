var limitMenu = null;
var limitSpeedItem = null;
var limitToggleItem = null;

var limitMultiplier = 20;

var vehicleMaxSpeed = {};
var vehicleMaxSpeedEnabled = {};

var blockedModels = [782665360, -1860900134]; // people can't speed limit these vehicles (rhino and insurgent for example)
var blockedCategories = [14, 15, 16]; // people can't speed limit vehicles that belong these categories - https://wiki.gt-mp.net/index.php?title=Vehicle_Classes

function IsModelBlocked(model) {
    // model check
    if (blockedModels.indexOf(model) > -1) return true;

    // category check
    if (blockedCategories.indexOf(API.getVehicleClass(model)) > -1) return true;

    // wow not blocked
    return false;
}

function SetVehicleMaxSpeed(vehicle, limit) {
    vehicleMaxSpeed[ API.getEntityModel(vehicle) ] = limit;
}

function GetVehicleLimiterStatus(vehicle) {
    var model = API.getEntityModel(vehicle);
    return (vehicleMaxSpeedEnabled[model] === undefined) ? false : vehicleMaxSpeedEnabled[model];
}

function SetVehicleLimiterStatus(vehicle, status) {
    var model = API.getEntityModel(vehicle);
    
    if (status) {
        API.callNative("SET_ENTITY_MAX_SPEED", vehicle, (vehicleMaxSpeed[model] === undefined) ? (API.getVehicleMaxSpeed(model) * 3.6) : (vehicleMaxSpeed[model] / 3.6));
    } else {
        API.callNative("SET_ENTITY_MAX_SPEED", vehicle, API.getVehicleMaxSpeed(model) * 3.6);
    }
    
    vehicleMaxSpeedEnabled[model] = status;
}

API.onKeyDown.connect(function(sender, key) {
    if (!API.isChatOpen() && key.KeyCode == Keys.L && API.isPlayerInAnyVehicle( API.getLocalPlayer() ) && API.getPlayerVehicleSeat( API.getLocalPlayer() ) == -1)
    {
        var model = API.getEntityModel( API.getPlayerVehicle( API.getLocalPlayer() ) );
        if (IsModelBlocked(model))
        {
            API.sendNotification("~r~Can't use Speed Limiter on this vehicle!");
            return;
        }

        if (limitMenu == null) {
            // first time
            limitMenu = API.createMenu("Speed Limiter", "Model: ~b~" + API.getVehicleDisplayName(model), 0, 0, 6);

            var limits = new List(String);
            limits.Add("No Limit");
            for (var i = limitMultiplier; i <= 120; i += limitMultiplier) limits.Add(i.toString());

            limitSpeedItem = API.createListItem("Limit", "Adjusts the speed limit.", limits, 0);
            limitMenu.AddItem(limitSpeedItem);

            limitToggleItem = API.createCheckboxItem("Active", "Toggles the speed limit.", (vehicleMaxSpeedEnabled[model] !== undefined) ? vehicleMaxSpeedEnabled[model] : false);
            limitMenu.AddItem(limitToggleItem);

            limitSpeedItem.OnListChanged.connect(function(sender, new_index) {
                var vehicle = API.getPlayerVehicle( API.getLocalPlayer() );
                
                SetVehicleMaxSpeed(vehicle, (new_index == 0) ? (API.getVehicleMaxSpeed( API.getEntityModel(vehicle) ) * 3.6) : parseInt(limitSpeedItem.IndexToItem(new_index)));
                SetVehicleLimiterStatus(vehicle, GetVehicleLimiterStatus(vehicle));
            });
            
            limitToggleItem.CheckboxEvent.connect(function(sender, is_checked) {
                SetVehicleLimiterStatus(API.getPlayerVehicle( API.getLocalPlayer() ), is_checked );
            });
            
            limitMenu.RefreshIndex();
            limitMenu.Visible = true;
        } else {
            // update the menu
            limitMenu.RefreshIndex();
            limitMenu.Visible = !limitMenu.Visible;

            if (limitMenu.Visible)
            {
                API.setMenuSubtitle(limitMenu, "Model: ~b~" + API.getVehicleDisplayName(model));

                var index = 0;
                if (vehicleMaxSpeed[model] !== undefined)
                {
                    for (var i = limitMultiplier; i <= 120; i += limitMultiplier)
                    {
                        if (i == vehicleMaxSpeed[model])
                        {
                            index = (i / limitMultiplier);
                            break;
                        }
                    }
                }

                limitSpeedItem.Index = index;
                limitToggleItem.Checked = GetVehicleLimiterStatus( API.getPlayerVehicle( API.getLocalPlayer() ) );
            }
        }
    }
});

API.onPlayerEnterVehicle.connect(function(vehicle) {
    if (API.getPlayerVehicleSeat( API.getLocalPlayer() ) == -1 && vehicleMaxSpeed[ API.getEntityModel(vehicle) ] !== undefined) SetVehicleLimiterStatus(vehicle, GetVehicleLimiterStatus(vehicle));
});

API.onPlayerExitVehicle.connect(function(vehicle) {
    if (limitMenu != null && limitMenu.Visible) limitMenu.Visible = false;
});

API.onUpdate.connect(function() {
    if (limitMenu != null) API.drawMenu(limitMenu);
});