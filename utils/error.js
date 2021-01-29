"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.errExpressionPropExists=exports.errExpressionActionExists=exports.errComponentDefaultSlotMix=exports.errExpressionRequiredProp=exports.errComponentNoMeta=exports.errComponentNoFile=exports.errConfigMissingProp=exports.errConfigBadPropValue=exports.errConfigBadPropType=exports.errNoSuchFile=exports.Errors=exports.error=exports.SnowbladeComponentError=exports.SnowbladeError=void 0;const componentimportmanager_1=require("../lib/componentimportmanager");class SnowbladeError extends Error{constructor(r){super();const e=Object.assign({name:"SnowbladeError",message:"A generic SnowbladeError occurred. That's all we know.",code:Errors.UNKNOWN,showStack:!1},r);this.name=e.name,this.message=e.message,this.code=e.code,this.showStack=e.showStack}}exports.SnowbladeError=SnowbladeError;class SnowbladeComponentError extends SnowbladeError{constructor(r){"string"!=typeof r.message&&(r.messageBuilder=r.message),super(r);const e=Object.assign({name:"SnowbladeComponentError",message:"A generic SnowbladeComponentError occurred. That's all we know.",showStack:!0},r);this.component=r.component,this.message=e.message,this.name=e.name,this.showStack=e.showStack,this.buildStack(),this.buildMessage(r)}buildMessage(r){this.message=void 0===r.messageBuilder?this.message:r.messageBuilder(this)}buildStack(){this.stackArr=["Import Stack:"];let r=this.component;for(;r.context instanceof componentimportmanager_1.default;){const e=void 0===r.file?r.path:r.file;this.stackArr.push(`${space(4)}- ${e}`),r=r.context.component}this.stackArr.push(`${space(4)}- ${r.path}`),this.stack=this.stackArr.join("\n")}}function error(r){throw r}function space(r){return Array(r+1).map(r=>null).join(" ")}var Errors;function errNoSuchFile(r){return new SnowbladeError({code:Errors.NO_SUCH_FILE,name:"FilesystemError",message:`Could not read file at given path \`${r}\``})}function errConfigBadPropType(r,e){return new SnowbladeError({code:Errors.CONFIG_BAD_PROP_TYPE,name:"SnowbladeConfigError",message:`Property \`${r}\` of given config has incorrect type \`${typeof e}\`.`})}function errConfigBadPropValue(r,e){return new SnowbladeError({code:Errors.CONFIG_BAD_PROP_VALUE,name:"SnowbladeConfigError",message:`Property \`${r}\` of given config has incorrect value \`${e}\`.`})}function errConfigMissingProp(r){return new SnowbladeError({code:Errors.CONFIG_MISSING_PROP,name:"SnowbladeConfigError",message:`Required property \`${r}\` is missing for given config.`})}function errComponentNoFile(r){return new SnowbladeComponentError({component:r,code:Errors.COMPONENT_NO_FILE,name:"SnowbladeComponentError",message:function(r){return 2===r.stackArr.length?`No such file found for input component at path:\n${space(30)}-> ${r.component.path}.`:`No such file found for imported component at:\n${space(30)}-> ${r.component.path},\n${space(29)}linked in:\n${space(30)}-> ${r.component.context.component.file}.`}})}function errComponentNoMeta(r){return new SnowbladeError({code:Errors.COMPONENT_NO_META,name:"SnowbladeComponentError",message:`Imported component at ${r} contains no <meta> tag for named export.`})}function errExpressionRequiredProp(r,e){return new SnowbladeError({code:Errors.EXPRESSION_REQUIRED_PROP,name:"SnowbladeExpressionError",message:`Required property \`${e}\` is missing on expression for component \`${r}\`.`})}function errComponentDefaultSlotMix(r){return new SnowbladeError({code:Errors.COMPONENT_DEFAULT_SLOT_MIX,name:"SnowbladeComponentError",message:`Component at "${r}" cannot declare more than one slot when a default/unnamed slot is declared.`})}function errExpressionActionExists(r,e,o){return new SnowbladeError({code:Errors.EXPRESSION_ACTION_EXISTS,name:"SnowbladeExpresssionError",message:`Expression "${r}" in component at "${e}" declares existing action ${o}.`})}function errExpressionPropExists(r,e,o){return new SnowbladeError({code:Errors.EXPRESSION_PROP_EXISTS,name:"SnowbladeExpresssionError",message:`Expression "${r}" in component at "${e}" assigns existing property ${o}.`})}exports.SnowbladeComponentError=SnowbladeComponentError,exports.error=error,function(r){r.UNKNOWN="UNKNOWN_SNOWBLADE_ERROR",r.NO_SUCH_FILE="NO_SUCH_FILE",r.CONFIG_BAD_PROP_TYPE="CONFIG_BAD_PROP_TYPE",r.CONFIG_BAD_PROP_VALUE="CONFIG_BAD_PROP_VALUE",r.CONFIG_MISSING_PROP="CONFIG_MISSING_PROP",r.COMPONENT_NO_META="COMPONENT_NO_META",r.COMPONENT_NO_FILE="COMPONENT_NO_FILE",r.EXPRESSION_REQUIRED_PROP="EXPRESSION_REQUIRED_PROP",r.EXPRESSION_ACTION_EXISTS="EXPRESSION_ACTION_EXISTS",r.EXPRESSION_PROP_EXISTS="EXPRESSION_PROP_EXISTS",r.COMPONENT_DEFAULT_SLOT_MIX="COMPONENT_DEFAULT_SLOT_MIX"}(Errors=exports.Errors||(exports.Errors={})),exports.errNoSuchFile=errNoSuchFile,exports.errConfigBadPropType=errConfigBadPropType,exports.errConfigBadPropValue=errConfigBadPropValue,exports.errConfigMissingProp=errConfigMissingProp,exports.errComponentNoFile=errComponentNoFile,exports.errComponentNoMeta=errComponentNoMeta,exports.errExpressionRequiredProp=errExpressionRequiredProp,exports.errComponentDefaultSlotMix=errComponentDefaultSlotMix,exports.errExpressionActionExists=errExpressionActionExists,exports.errExpressionPropExists=errExpressionPropExists;